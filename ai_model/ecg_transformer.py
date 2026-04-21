import os
import json
import shutil
import numpy as np
import pandas as pd
import wfdb
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import (
    classification_report, confusion_matrix,
    roc_curve, auc, precision_recall_curve
)
from sklearn.preprocessing import label_binarize
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns
from collections import Counter
import shap
import lime
import lime.lime_tabular
from scipy.signal import butter, filtfilt
import warnings
warnings.filterwarnings('ignore')

# Reproducibility
np.random.seed(42)
tf.random.set_seed(42)

print(f' TensorFlow version: {tf.__version__}')
print(f' GPU available: {len(tf.config.list_physical_devices("GPU")) > 0}')

# Configuration des dossiers
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')

#  CONFIGURATION  (Adaptée pour le local)
CONFIG = {
    # Chemins des Datasets locaux
    'MIT_BIH_ARR_PATH'  : os.path.join(DATA_DIR, 'mit-bih-arrhythmia-database'),
    'MIT_BIH_NSR_PATH'  : os.path.join(DATA_DIR, 'mit-bih-normal-sinus-rhythm-database'),
    'CHAPMAN_PATH'      : os.path.join(DATA_DIR, 'Chapman-Shaoxing'),
    'PTB_PATH'          : os.path.join(DATA_DIR, 'ptb-diagnostic-ecg-database'),

    # Hyperparamètres du modèle
    'WINDOW_SIZE'       : 360,
    'D_MODEL'           : 128,       
    'NUM_HEADS'         : 8,         
    'NUM_LAYERS'        : 4,         
    'FF_DIM'            : 256,       
    'DROPOUT_RATE'      : 0.2,
    'NUM_CLASSES'       : 5,

    # Entraînement
    'EPOCHS'            : 60,
    'BATCH_SIZE'        : 64,
    'LEARNING_RATE'     : 3e-4,
    'TARGET_PER_CLASS'  : 8000,

    # Chemins de sauvegarde
    'SAVE_DIR'          : os.path.join(BASE_DIR, 'saved_models'),
    'MODEL_KERAS'       : 'ecg_transformer.keras',
    'MODEL_H5'          : 'ecg_transformer.h5',
    'MODEL_TF'          : 'ecg_transformer_tf',
    'LABEL_ENCODER'     : 'label_encoder_classes.npy',
}

# Création du dossier de sauvegarde
os.makedirs(CONFIG['SAVE_DIR'], exist_ok=True)
print(' Configuration set (local paths adjusted)')
print(f' Save directory: {CONFIG["SAVE_DIR"]}')

class ECGAugmenter:
    """Techniques d'augmentation pour signaux ECG : Time Warping, Scaling, Shifting"""
    def __init__(self, sigma=0.05):
        self.sigma = sigma

    def augment(self, x):
        method = np.random.choice(['warp', 'scale', 'shift', 'noise', 'none'], p=[0.25, 0.25, 0.2, 0.2, 0.1])
        if method == 'warp': return self.time_warp(x)
        if method == 'scale': return self.scaling(x)
        if method == 'shift': return self.shifting(x)
        if method == 'noise': return x + np.random.normal(0, self.sigma, len(x))
        return x

    def time_warp(self, x, sigma=0.1, knots=4):
        from scipy.interpolate import CubicSpline
        t = np.arange(len(x))
        random_warps = np.random.normal(1, sigma, knots + 2)
        warp_steps = np.linspace(0, len(x)-1, knots + 2)
        warper = CubicSpline(warp_steps, random_warps)(t)
        scale = len(x) / np.sum(warper)
        warped_t = np.cumsum(warper) * scale
        return np.interp(t, warped_t, x)

    def scaling(self, x, sigma=0.1):
        factor = np.random.normal(1, sigma)
        return x * factor

    def shifting(self, x, max_shift=20):
        shift = np.random.randint(-max_shift, max_shift)
        return np.roll(x, shift)

class ECGDataLoader:
    def __init__(self, window_size=360):
        self.window_size = window_size
        self.label_encoder = LabelEncoder()
        self.augmenter = ECGAugmenter()
        self.annotation_mapping = {
            'N': 'Normal',  'L': 'Normal',  'R': 'Normal',
            'e': 'Normal',  'j': 'Normal',
            'V': 'PVC',     'E': 'PVC',     '/': 'PVC',
            'A': 'SVEB',    'a': 'SVEB',    'S': 'SVEB',    'J': 'SVEB',
            'F': 'Fusion',  'f': 'Fusion',
            'Q': 'Unclassified', '?': 'Unclassified'
        }

    def butter_filter(self, signal, lowcut=0.5, highcut=40, fs=360, order=4):
        nyquist = 0.5 * fs
        low = lowcut / nyquist
        high = min(highcut / nyquist, 0.99)
        b, a = butter(order, [low, high], btype='band')
        return filtfilt(b, a, signal)

    def normalize_signal(self, signal):
        """Z-score normalization per signal"""
        std = np.std(signal)
        if std < 1e-8:
            return signal - np.mean(signal)
        return (signal - np.mean(signal)) / std

    def load_mit_bih_arrhythmia(self):
        print('Loading MIT-BIH Arrhythmia Database...')
        signals, labels = [], []
        record_files = [
            f.replace('.hea', '')
            for f in os.listdir(CONFIG['MIT_BIH_ARR_PATH'])
            if f.endswith('.hea')
        ]
        for record_name in record_files[:20]:
            try:
                path = os.path.join(CONFIG['MIT_BIH_ARR_PATH'], record_name)
                record = wfdb.rdrecord(path)
                annotation = wfdb.rdann(path, 'atr')
                signal = self.butter_filter(record.p_signal[:, 0], fs=record.fs)
                half = self.window_size // 2
                for sample, symbol in zip(annotation.sample, annotation.symbol):
                    if symbol not in self.annotation_mapping:
                        continue
                    start = sample - half
                    end   = sample + half
                    if start < 0 or end > len(signal):
                        continue
                    beat = self.normalize_signal(signal[start:end])
                    signals.append(beat)
                    labels.append(self.annotation_mapping[symbol])
                print(f'  {record_name}: {len(annotation.sample)} beats')
            except Exception as e:
                print(f'  Error {record_name}: {e}')
        return np.array(signals), np.array(labels)

    def load_mit_bih_nsrdb(self):
        print('Loading MIT-BIH NSRDB...')
        signals, labels = [], []
        record_files = [
            f.replace('.hea', '')
            for f in os.listdir(CONFIG['MIT_BIH_NSR_PATH'])
            if f.endswith('.hea')
        ]
        for record_name in record_files[:5]:
            try:
                path = os.path.join(CONFIG['MIT_BIH_NSR_PATH'], record_name)
                record = wfdb.rdrecord(path)
                signal = self.butter_filter(record.p_signal[:, 0], fs=record.fs)
                step = self.window_size * 10
                count = 0
                for i in range(0, len(signal) - self.window_size, step):
                    if count >= 100:
                        break
                    beat = self.normalize_signal(signal[i:i + self.window_size])
                    signals.append(beat)
                    labels.append('Normal')
                    count += 1
                print(f'  {record_name}: {count} segments')
            except Exception as e:
                print(f'  Error {record_name}: {e}')
        return np.array(signals), np.array(labels)

    def load_all_datasets(self):
        all_signals, all_labels = [], []

        for loader, name in [
            (self.load_mit_bih_arrhythmia, 'MIT-BIH Arrhythmia'),
            (self.load_mit_bih_nsrdb,      'MIT-BIH NSRDB'),
        ]:
            try:
                sigs, labs = loader()
                all_signals.extend(sigs)
                all_labels.extend(labs)
                print(f'{name}: {len(sigs)} samples')
            except Exception as e:
                print(f'Error loading {name}: {e}')

        X = np.array(all_signals)
        y = np.array(all_labels)

        print(f'\nTotal before balancing: {len(X)} samples')
        for cls, cnt in Counter(y).items():
            print(f'  {cls}: {cnt} ({cnt/len(y)*100:.1f}%)')

        X_bal, y_bal = self.balance_dataset(X, y)

        print(f'\nTotal after balancing: {len(X_bal)} samples')
        for cls, cnt in Counter(y_bal).items():
            print(f'  {cls}: {cnt} ({cnt/len(y_bal)*100:.1f}%)')

        y_enc = self.label_encoder.fit_transform(y_bal)
        return X_bal, y_enc, y_bal

    def balance_dataset(self, X, y):
        from sklearn.utils import resample
        target = CONFIG['TARGET_PER_CLASS']
        print(f'Target per class: {target}')

        X_out, y_out = [], []
        for cls in np.unique(y):
            mask = y == cls
            Xc, yc = X[mask], y[mask]
            n = len(Xc)
            print(f'  {cls}: {n} -> {target}')

            if n >= target:
                Xr, yr = resample(Xc, yc, n_samples=target, random_state=42)
            else:
                Xr = list(Xc)
                yr = list(yc)
                while len(Xr) < target:
                    idx = np.random.randint(0, len(Xc))
                    aug = self.augmenter.augment(Xc[idx])
                    aug = self.normalize_signal(aug)
                    Xr.append(aug)
                    yr.append(yc[idx])
                Xr, yr = Xr[:target], yr[:target]

            X_out.extend(Xr)
            y_out.extend(yr)

        combined = list(zip(X_out, y_out))
        np.random.shuffle(combined)
        Xb, yb = zip(*combined)
        return np.array(Xb), np.array(yb)

print(' ECGDataLoader defined')

class TransformerBlock(layers.Layer):
    """Single Transformer encoder block with pre-norm (more stable)"""

    def __init__(self, d_model, num_heads, ff_dim, dropout_rate=0.1, **kwargs):
        super().__init__(**kwargs)
        self.attn = layers.MultiHeadAttention(
            num_heads=num_heads,
            key_dim=d_model // num_heads,
            dropout=dropout_rate
        )
        self.ff1   = layers.Dense(ff_dim,  activation='gelu')
        self.ff2   = layers.Dense(d_model)
        self.norm1 = layers.LayerNormalization(epsilon=1e-6)
        self.norm2 = layers.LayerNormalization(epsilon=1e-6)
        self.drop1 = layers.Dropout(dropout_rate)
        self.drop2 = layers.Dropout(dropout_rate)

    def call(self, x, training=False, return_attention=False):
        # Pre-norm attention
        x_norm = self.norm1(x)
        if return_attention:
            attn_out, attn_weights = self.attn(
                x_norm, x_norm,
                return_attention_scores=True,
                training=training
            )
        else:
            attn_out  = self.attn(x_norm, x_norm, training=training)
            attn_weights = None
        x = x + self.drop1(attn_out, training=training)

        # Pre-norm feed-forward
        x_norm = self.norm2(x)
        ff_out = self.ff2(self.ff1(x_norm))
        x = x + self.drop2(ff_out, training=training)

        if return_attention:
            return x, attn_weights
        return x


class ResidualCNNBlock(layers.Layer):
    """Residual 1D CNN block for robust local feature extraction"""

    def __init__(self, filters, kernel_size=3, **kwargs):
        super().__init__(**kwargs)
        self.conv1 = layers.Conv1D(filters, kernel_size, padding='same', activation='relu')
        self.conv2 = layers.Conv1D(filters, kernel_size, padding='same')
        self.proj  = layers.Conv1D(filters, 1, padding='same')  # projection for residual
        self.bn1   = layers.BatchNormalization()
        self.bn2   = layers.BatchNormalization()
        self.act   = layers.Activation('relu')

    def call(self, x, training=False):
        residual = self.proj(x)
        x = self.bn1(self.conv1(x), training=training)
        x = self.bn2(self.conv2(x), training=training)
        return self.act(x + residual)


def positional_encoding(length, depth):
    depth = depth // 2
    positions = np.arange(length)[:, np.newaxis]
    depths     = np.arange(depth)[np.newaxis, :] / depth
    angle_rates = 1 / (10000 ** depths)
    angle_rads  = positions * angle_rates
    pos_enc = np.concatenate([np.sin(angle_rads), np.cos(angle_rads)], axis=-1)
    return tf.cast(pos_enc, dtype=tf.float32)


def build_improved_transformer(
    input_length=360,
    num_classes=5,
    d_model=128,
    num_heads=8,
    num_layers=4,
    ff_dim=256,
    dropout_rate=0.2
):
    inputs = layers.Input(shape=(input_length,), name='ecg_input')
    x = layers.Reshape((input_length, 1))(inputs)

    # ── Stage 1: Residual CNN feature extractor ──
    x = ResidualCNNBlock(32,  kernel_size=5, name='res_cnn_1')(x)
    x = ResidualCNNBlock(64,  kernel_size=5, name='res_cnn_2')(x)
    x = layers.MaxPooling1D(2)(x)              # (180, 64)
    x = ResidualCNNBlock(128, kernel_size=3, name='res_cnn_3')(x)
    x = layers.MaxPooling1D(2)(x)              # (90, 128)

    # ── Stage 2: Project to d_model ──
    x = layers.Dense(d_model, name='proj')(x)  # (90, d_model)

    # ── Stage 3: Positional encoding ──
    seq_len = input_length // 4  # after 2× MaxPool
    pos_enc = positional_encoding(seq_len, d_model)
    x = x + pos_enc
    x = layers.Dropout(dropout_rate)(x)

    # ── Stage 4: Transformer blocks ──
    for i in range(num_layers):
        x = TransformerBlock(
            d_model, num_heads, ff_dim, dropout_rate,
            name=f'transformer_{i}'
        )(x)

    # ── Stage 5: Classification head ──
    x = layers.GlobalAveragePooling1D(name='gap')(x)
    x = layers.Dense(128, activation='gelu')(x)
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(64, activation='gelu')(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(num_classes, activation='softmax', name='predictions')(x)

    model = keras.Model(inputs, outputs, name='ECG_Transformer_v2')
    return model


print(' Improved Transformer model defined')

# ─── Load data ───────────────────────────────────────────────
try:
    loader = ECGDataLoader(window_size=CONFIG['WINDOW_SIZE'])
    X, y_enc, y_orig = loader.load_all_datasets()

    CLASS_NAMES = list(loader.label_encoder.classes_)
    print(f'\nClasses: {CLASS_NAMES}')
    print(f'Data shape: {X.shape}')

    # ─── Split ───────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_enc, test_size=0.2, stratify=y_enc, random_state=42
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train, y_train, test_size=0.2, stratify=y_train, random_state=42
    )
    print(f'Train: {len(X_train)} | Val: {len(X_val)} | Test: {len(X_test)}')

    # ─── Build model ─────────────────────────────────────────────
    model = build_improved_transformer(
        input_length  = CONFIG['WINDOW_SIZE'],
        num_classes   = CONFIG['NUM_CLASSES'],
        d_model       = CONFIG['D_MODEL'],
        num_heads     = CONFIG['NUM_HEADS'],
        num_layers    = CONFIG['NUM_LAYERS'],
        ff_dim        = CONFIG['FF_DIM'],
        dropout_rate  = CONFIG['DROPOUT_RATE'],
    )

    model.compile(
        optimizer = keras.optimizers.AdamW(
            learning_rate = CONFIG['LEARNING_RATE'],
            weight_decay  = 1e-4
        ),
        loss = keras.losses.SparseCategoricalCrossentropy(),
        metrics = ['accuracy']
    )

    model.summary()

    # ─── Callbacks ───────────────────────────────────────────────
    callbacks = [
        keras.callbacks.EarlyStopping(
            patience=15, restore_best_weights=True, monitor='val_accuracy'
        ),
        keras.callbacks.ReduceLROnPlateau(
            factor=0.5, patience=7, min_lr=1e-6, monitor='val_accuracy', verbose=1
        ),
        keras.callbacks.ModelCheckpoint(
            os.path.join(CONFIG['SAVE_DIR'], 'best_model.keras'),
            save_best_only=True, monitor='val_accuracy', mode='max', verbose=1
        ),
    ]

    # ─── Train ───────────────────────────────────────────────────
    print('\n Training started...')
    history = model.fit(
        X_train, y_train,
        validation_data = (X_val, y_val),
        epochs     = CONFIG['EPOCHS'],
        batch_size = CONFIG['BATCH_SIZE'],
        callbacks  = callbacks,
        verbose    = 1
    )
    print('Training complete!')
    
    # ─── Visualiser l'historique ──────────────────────────────────
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle('Training History — ECG Transformer v2', fontsize=14, fontweight='bold')

    # Loss
    axes[0].plot(history.history['loss'],     label='Train Loss', color='steelblue', lw=2)
    axes[0].plot(history.history['val_loss'], label='Val Loss',   color='tomato',    lw=2, linestyle='--')
    axes[0].set_title('Loss')
    axes[0].set_xlabel('Epoch')
    axes[0].set_ylabel('Loss')
    axes[0].legend()
    axes[0].grid(alpha=0.3)

    # Accuracy
    axes[1].plot(history.history['accuracy'],     label='Train Acc', color='steelblue', lw=2)
    axes[1].plot(history.history['val_accuracy'], label='Val Acc',   color='tomato',    lw=2, linestyle='--')
    best_epoch = np.argmax(history.history['val_accuracy'])
    best_acc   = max(history.history['val_accuracy'])
    axes[1].axvline(best_epoch, color='green', linestyle=':', lw=1.5, label=f'Best epoch ({best_epoch+1})')
    axes[1].set_title(f'Accuracy (Best Val: {best_acc:.4f})')
    axes[1].set_xlabel('Epoch')
    axes[1].set_ylabel('Accuracy')
    axes[1].legend()
    axes[1].grid(alpha=0.3)

    plt.tight_layout()
    plt.savefig(os.path.join(CONFIG['SAVE_DIR'], 'training_curves.png'), dpi=150, bbox_inches='tight')
    plt.show()
    print(' Training curves saved')

    # ─── Predictions ─────────────────────────────────────────────
    print('\nEvaluating on test set...')
    y_proba = model.predict(X_test, batch_size=128)
    y_pred  = np.argmax(y_proba, axis=1)

    y_test_names = loader.label_encoder.inverse_transform(y_test)
    y_pred_names = loader.label_encoder.inverse_transform(y_pred)

    # ─── Classification Report ───────────────────────────────────
    print('\n' + '=' * 60)
    print('Classification Report')
    print('=' * 60)
    print(classification_report(y_test_names, y_pred_names, target_names=CLASS_NAMES))

    # ─── Confusion Matrix ────────────────────────────────────────
    cm = confusion_matrix(y_test_names, y_pred_names, labels=CLASS_NAMES)
    cm_norm = cm.astype(float) / cm.sum(axis=1, keepdims=True)  # row-normalized

    fig, axes = plt.subplots(1, 2, figsize=(16, 6))
    fig.suptitle('Confusion Matrix — ECG Transformer v2', fontsize=14, fontweight='bold')

    # Raw counts
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES, ax=axes[0])
    axes[0].set_title('Raw Counts')
    axes[0].set_ylabel('True Label')
    axes[0].set_xlabel('Predicted Label')

    # Normalized
    sns.heatmap(cm_norm, annot=True, fmt='.2f', cmap='Greens',
                xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES, ax=axes[1])
    axes[1].set_title('Normalized (Recall per Class)')
    axes[1].set_ylabel('True Label')
    axes[1].set_xlabel('Predicted Label')

    plt.tight_layout()
    plt.savefig(os.path.join(CONFIG['SAVE_DIR'], 'confusion_matrix.png'), dpi=150, bbox_inches='tight')
    plt.show()
    print(' Confusion matrix saved')

    # ─── ROC & Precision-Recall Curves ──────────────────────────
    print('\nGenerating ROC and Precision-Recall curves...')
    y_test_bin = label_binarize(y_test, classes=np.arange(CONFIG['NUM_CLASSES']))

    fig, axes = plt.subplots(1, 2, figsize=(16, 6))
    fig.suptitle('ROC & Precision-Recall Curves', fontsize=14, fontweight='bold')
    colors = ['steelblue', 'tomato', 'green', 'orange', 'purple']

    # ROC
    for i, (cls_name, color) in enumerate(zip(CLASS_NAMES, colors)):
        fpr, tpr, _ = roc_curve(y_test_bin[:, i], y_proba[:, i])
        roc_auc = auc(fpr, tpr)
        axes[0].plot(fpr, tpr, color=color, lw=2, label=f'{cls_name} (AUC={roc_auc:.3f})')
    axes[0].plot([0,1],[0,1], 'k--', lw=1)
    axes[0].set_title('ROC Curves')
    axes[0].set_xlabel('False Positive Rate')
    axes[0].set_ylabel('True Positive Rate')
    axes[0].legend(fontsize=9)
    axes[0].grid(alpha=0.3)

    # Precision-Recall
    for i, (cls_name, color) in enumerate(zip(CLASS_NAMES, colors)):
        prec, rec, _ = precision_recall_curve(y_test_bin[:, i], y_proba[:, i])
        pr_auc = auc(rec, prec)
        axes[1].plot(rec, prec, color=color, lw=2, label=f'{cls_name} (AUC={pr_auc:.3f})')
    axes[1].set_title('Precision-Recall Curves')
    axes[1].set_xlabel('Recall')
    axes[1].set_ylabel('Precision')
    axes[1].legend(fontsize=9)
    axes[1].grid(alpha=0.3)

    plt.tight_layout()
    plt.savefig(os.path.join(CONFIG['SAVE_DIR'], 'roc_pr_curves.png'), dpi=150, bbox_inches='tight')
    plt.show()
    print(' ROC & PR curves saved')

    # ─── XAI: Grad-CAM 1D ──────────────────────────────────────
    class GradCAM1D:
        """
        Gradient-weighted Class Activation Mapping for 1D signals.
        Shows WHICH parts of the ECG beat the model focuses on.
        """

        def __init__(self, model, last_conv_layer_name='res_cnn_3'):
            self.model = model
            # Build gradient model up to the chosen conv layer
            self.grad_model = keras.Model(
                inputs  = model.inputs,
                outputs = [model.get_layer(last_conv_layer_name).output,
                           model.output]
            )

        def compute_heatmap(self, signal, class_idx=None):
            signal_tensor = tf.cast(signal[np.newaxis, :], tf.float32)
            with tf.GradientTape() as tape:
                conv_outputs, predictions = self.grad_model(signal_tensor)
                if class_idx is None:
                    class_idx = tf.argmax(predictions[0])
                loss = predictions[:, class_idx]

            grads = tape.gradient(loss, conv_outputs)
            # Pool gradients over time axis → (channels,)
            pooled_grads = tf.reduce_mean(grads, axis=(0, 1))
            conv_out = conv_outputs[0]
            # Weighted sum of feature maps
            heatmap = tf.reduce_sum(conv_out * pooled_grads, axis=-1).numpy()
            # Normalize to [0, 1]
            heatmap = np.maximum(heatmap, 0)
            if heatmap.max() > 0:
                heatmap /= heatmap.max()
            return heatmap, int(class_idx)


    def plot_gradcam(signal, heatmap, true_label, pred_label, confidence, idx=0, save_path=None):
        fig, axes = plt.subplots(2, 1, figsize=(14, 6),
                                gridspec_kw={'height_ratios': [3, 1]})
        fig.suptitle(
            f'Grad-CAM — Sample {idx}\nTrue: {true_label}  |  Pred: {pred_label}  '
            f'(Confidence: {confidence:.1%})',
            fontsize=13, fontweight='bold'
        )

        t = np.arange(len(signal))

        # Signal colored by Grad-CAM
        # Upsample heatmap to match signal length
        heatmap_up = np.interp(
            np.linspace(0, len(heatmap) - 1, len(signal)),
            np.arange(len(heatmap)), heatmap
        )

        # Background color fill
        for i in range(len(t) - 1):
            alpha = float(heatmap_up[i])
            axes[0].axvspan(t[i], t[i+1], alpha=alpha * 0.4, color='tomato', lw=0)

        axes[0].plot(t, signal, color='steelblue', lw=1.5, label='ECG Signal')
        axes[0].set_ylabel('Amplitude (normalized)')
        axes[0].set_xlabel('Samples')
        axes[0].legend(loc='upper right')
        axes[0].grid(alpha=0.3)
        axes[0].set_title('🔴 Red = High Importance Regions', fontsize=10)

        # Heatmap bar
        axes[1].fill_between(np.linspace(0, len(signal), len(heatmap_up)),
                            heatmap_up, color='tomato', alpha=0.7)
        axes[1].set_ylabel('Importance')
        axes[1].set_xlabel('Samples')
        axes[1].set_ylim(0, 1.1)
        axes[1].grid(alpha=0.3)

        plt.tight_layout()
        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.show()


    # ─── Run Grad-CAM on one sample per class ────────────────────
    print('\nGenerating Grad-CAM explanations...')
    gradcam = GradCAM1D(model, last_conv_layer_name='res_cnn_3')

    for cls_idx, cls_name in enumerate(CLASS_NAMES):
        # Find a correctly predicted sample for this class
        mask = (y_test == cls_idx) & (y_pred == cls_idx)
        if mask.sum() == 0:
            print(f'  No correct prediction found for {cls_name}, skipping')
            continue
        sample_idx = np.where(mask)[0][0]
        signal = X_test[sample_idx]

        heatmap, pred_class = gradcam.compute_heatmap(signal, class_idx=cls_idx)
        confidence = float(y_proba[sample_idx, cls_idx])

        save_path = os.path.join(CONFIG['SAVE_DIR'], f'gradcam_{cls_name}.png')
        plot_gradcam(signal, heatmap, cls_name, cls_name, confidence,
                    idx=sample_idx, save_path=save_path)

    print(' Grad-CAM explanations saved')

    # ─── XAI: Attention Visualization ──────────────────────────
    def get_attention_weights(model, signal, layer_name='transformer_0'):
        """
        Extract multi-head attention weights from a Transformer block.
        Returns: attention weights of shape (num_heads, seq_len, seq_len)
        """
        # Build sub-model up to the transformer block
        transformer_layer = model.get_layer(layer_name)

        # Get intermediate output just before this block
        signal_tensor = tf.cast(signal[np.newaxis, :], tf.float32)

        # Get the output after CNN + projection layers (input to transformer)
        intermediate_model = keras.Model(
            inputs  = model.inputs,
            outputs = model.get_layer('proj').output
        )

        seq_output = intermediate_model(signal_tensor)  # (1, seq_len, d_model)

        # Run the transformer block with return_attention=True
        _, attn_weights = transformer_layer(seq_output, return_attention=True)
        # attn_weights: (1, num_heads, seq_len, seq_len)
        return attn_weights[0].numpy()  # (num_heads, seq_len, seq_len)


    def plot_attention_weights(signal, attn_weights, true_label, pred_label, save_path=None):
        num_heads = attn_weights.shape[0]
        # Average over heads
        avg_attn = attn_weights.mean(axis=0)  # (seq_len, seq_len)

        fig, axes = plt.subplots(1, 2, figsize=(16, 5))
        fig.suptitle(
            f'Attention Weights — True: {true_label} | Pred: {pred_label}',
            fontsize=13, fontweight='bold'
        )

        # Attention heatmap (averaged)
        im = axes[0].imshow(avg_attn, cmap='hot', aspect='auto')
        axes[0].set_title(f'Average Attention Map ({num_heads} heads)')
        axes[0].set_xlabel('Key Position')
        axes[0].set_ylabel('Query Position')
        plt.colorbar(im, ax=axes[0])

        # Row-sum → importance score per time step
        importance = avg_attn.mean(axis=0)  # average attention received by each position
        importance_up = np.interp(
            np.linspace(0, len(importance) - 1, len(signal)),
            np.arange(len(importance)), importance
        )
        t = np.arange(len(signal))
        axes[1].plot(t, signal, color='steelblue', lw=1.5, alpha=0.8, label='ECG Signal')
        ax2 = axes[1].twinx()
        ax2.fill_between(t, importance_up, color='orange', alpha=0.4, label='Attention Score')
        ax2.set_ylabel('Attention Score', color='orange')
        axes[1].set_ylabel('Amplitude')
        axes[1].set_xlabel('Samples')
        axes[1].set_title('Signal + Attention Overlay')
        axes[1].grid(alpha=0.3)
        axes[1].legend(loc='upper left')

        plt.tight_layout()
        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
        plt.show()


    # ─── Plot attention for first correct prediction per class ────
    print('\nGenerating Attention Weight visualizations...')
    for cls_idx, cls_name in enumerate(CLASS_NAMES):
        mask = (y_test == cls_idx) & (y_pred == cls_idx)
        if mask.sum() == 0:
            continue
        sample_idx = np.where(mask)[0][0]
        signal = X_test[sample_idx]

        try:
            attn = get_attention_weights(model, signal, layer_name='transformer_0')
            save_path = os.path.join(CONFIG['SAVE_DIR'], f'attention_{cls_name}.png')
            plot_attention_weights(signal, attn, cls_name, cls_name, save_path=save_path)
        except Exception as e:
            print(f'  Error for {cls_name}: {e}')

    print(' Attention visualizations saved')

    # ─── XAI: SHAP Explanations ───────────────────────────────
    print('\nComputing SHAP values (this may take a few minutes)...')

    # Use a small background set for speed
    background_size = 100
    background = X_train[np.random.choice(len(X_train), background_size, replace=False)]

    def model_predict_proba(X):
        return model.predict(X, verbose=0)

    # KernelSHAP — model-agnostic
    explainer = shap.KernelExplainer(model_predict_proba, background[:50])

    # Explain 5 test samples (1 per class)
    shap_samples = []
    shap_labels  = []
    for cls_idx in range(CONFIG['NUM_CLASSES']):
        mask = (y_test == cls_idx) & (y_pred == cls_idx)
        if mask.sum() > 0:
            shap_samples.append(X_test[np.where(mask)[0][0]])
            shap_labels.append(CLASS_NAMES[cls_idx])

    shap_samples = np.array(shap_samples)
    shap_values  = explainer.shap_values(shap_samples, nsamples=200, silent=True)

    print(' SHAP values computed')

    # ── Plot SHAP for each class ──────────────────────────────────
    fig, axes = plt.subplots(len(shap_labels), 1, figsize=(14, 4 * len(shap_labels)))
    if len(shap_labels) == 1:
        axes = [axes]
    fig.suptitle('SHAP Feature Importance — ECG Samples', fontsize=14, fontweight='bold')

    for i, (ax, label) in enumerate(zip(axes, shap_labels)):
        cls_idx = CLASS_NAMES.index(label)
        signal  = shap_samples[i]
        t       = np.arange(len(signal))

        # ── Handle different SHAP output shapes robustly ──────────
        sv = np.array(shap_values)
        if isinstance(shap_values, list):
            # list of (n_samples, n_features) — one per class
            shap_val = np.array(shap_values[cls_idx][i]).flatten()
        elif sv.ndim == 3 and sv.shape[-1] == CONFIG['NUM_CLASSES']:
            # (n_samples, n_features, n_classes)
            shap_val = sv[i, :, cls_idx].flatten()
        elif sv.ndim == 3 and sv.shape[0] == CONFIG['NUM_CLASSES']:
            # (n_classes, n_samples, n_features)
            shap_val = sv[cls_idx, i, :].flatten()
        else:
            shap_val = sv[i].flatten()

        # Trim/pad to signal length just in case
        shap_val = shap_val[:len(signal)]

        ax.plot(t, signal, color='steelblue', lw=1.2, alpha=0.7, label='ECG Signal')
        ax2 = ax.twinx()
        ax2.bar(t, shap_val,
                color=['tomato' if v > 0 else 'steelblue' for v in shap_val],
                alpha=0.5, width=1)
        ax2.set_ylabel('SHAP Value', fontsize=9)
        ax2.axhline(0, color='black', lw=0.5)

        ax.set_title(
            f'Class: {label}  '
            f'(🔴 Positive = pushes toward {label} | 🔵 Negative = pushes away)'
        )
        ax.set_xlabel('Sample Index')
        ax.set_ylabel('Amplitude')
        ax.legend(loc='upper left', fontsize=8)
        ax.grid(alpha=0.2)

    plt.tight_layout()
    shap_path = os.path.join(CONFIG['SAVE_DIR'], 'shap_explanations.png')
    plt.savefig(shap_path, dpi=150, bbox_inches='tight')
    plt.show()
    print(f' SHAP plot saved to {shap_path}')

    # ─── XAI: LIME Explanations ───────────────────────────────
    print('\nGenerating LIME explanations...')

    # LIME works on tabular features (each sample point = one feature)
    lime_explainer = lime.lime_tabular.LimeTabularExplainer(
        training_data  = X_train[:500],
        feature_names  = [f't{i}' for i in range(CONFIG['WINDOW_SIZE'])],
        class_names    = CLASS_NAMES,
        mode           = 'classification',
        random_state   = 42
    )

    def lime_predict(X):
        return model.predict(X, verbose=0)

    fig, axes = plt.subplots(len(shap_labels), 1, figsize=(14, 4 * len(shap_labels)))
    if len(shap_labels) == 1:
        axes = [axes]
    fig.suptitle('LIME Explanations — Top 20 Most Important Time Points', fontsize=14, fontweight='bold')

    for ax, label in zip(axes, shap_labels):
        cls_idx = CLASS_NAMES.index(label)
        sample  = shap_samples[CLASS_NAMES.index(label)]

        exp = lime_explainer.explain_instance(
            sample,
            lime_predict,
            num_features = 20,
            labels       = [cls_idx]
        )

        # Extract feature importances
        feat_list = exp.as_list(label=cls_idx)
        importance = np.zeros(CONFIG['WINDOW_SIZE'])
        for feat_str, weight in feat_list:
            # feat_str looks like 't123 > 0.5', extract index
            try:
                feat_idx = int(feat_str.split('t')[-1].split(' ')[0])
                importance[feat_idx] = weight
            except:
                pass

        t = np.arange(len(sample))
        ax.plot(t, sample, color='steelblue', lw=1.5, alpha=0.7, label='ECG Signal')
        ax2 = ax.twinx()
        ax2.bar(t, importance,
                color=['tomato' if v > 0 else 'navy' for v in importance],
                alpha=0.6, width=1)
        ax2.set_ylabel('LIME Weight', fontsize=9)

        ax.set_title(f'LIME — Class: {label}')
        ax.set_xlabel('Sample Index')
        ax.set_ylabel('Amplitude')
        ax.legend(loc='upper left', fontsize=8)
        ax.grid(alpha=0.2)

    plt.tight_layout()
    lime_path = os.path.join(CONFIG['SAVE_DIR'], 'lime_explanations.png')
    plt.savefig(lime_path, dpi=150, bbox_inches='tight')
    plt.show()
    print(f' LIME plot saved to {lime_path}')

    # ─── Saving model in all formats ──────────────────────────────
    print('\nSaving model in all formats...')
    print('=' * 50)

    # ── 1. Save as .keras (recommended for Keras 3) ──────────────
    keras_path = os.path.join(CONFIG['SAVE_DIR'], CONFIG['MODEL_KERAS'])
    model.save(keras_path)
    size_kb = os.path.getsize(keras_path) / 1024
    print(f' .keras saved  → {keras_path}  ({size_kb:.1f} KB)')

    # ── 2. Save as .h5 (legacy Keras format) ─────────────────────
    h5_path = os.path.join(CONFIG['SAVE_DIR'], CONFIG['MODEL_H5'])
    model.save(h5_path, save_format='h5')
    size_kb = os.path.getsize(h5_path) / 1024
    print(f' .h5 saved     → {h5_path}  ({size_kb:.1f} KB)')

    # ── 3. Save as SavedModel / .tf format ───────────────────────
    tf_path = os.path.join(CONFIG['SAVE_DIR'], CONFIG['MODEL_TF'])
    try:
        model.export(tf_path)   # Creates a TF SavedModel directory
        print(f' .tf saved     → {tf_path}/')
    except Exception as export_err:
        print(f' .tf export skipped: {export_err}')

    # ── 4. Save label encoder classes ────────────────────────────
    le_path = os.path.join(CONFIG['SAVE_DIR'], CONFIG['LABEL_ENCODER'])
    np.save(le_path, loader.label_encoder.classes_)
    print(f' Label encoder → {le_path}')

    # ── 5. Save config as JSON ────────────────────────────────────
    config_path = os.path.join(CONFIG['SAVE_DIR'], 'model_config.json')
    with open(config_path, 'w') as f:
        json.dump({
            'window_size'  : CONFIG['WINDOW_SIZE'],
            'd_model'      : CONFIG['D_MODEL'],
            'num_heads'    : CONFIG['NUM_HEADS'],
            'num_layers'   : CONFIG['NUM_LAYERS'],
            'ff_dim'       : CONFIG['FF_DIM'],
            'num_classes'  : CONFIG['NUM_CLASSES'],
            'class_names'  : CLASS_NAMES,
        }, f, indent=2)
    print(f' Config JSON   → {config_path}')

    print('\n' + '=' * 50)
    print(' All files saved to:', CONFIG['SAVE_DIR'])

    # ─── Verifying saved models ───────────────────────────────
    print('\nVerifying saved models...')
    print('=' * 50)

    # ── Helper to load with custom objects ───────────────────────
    custom_objs = {
        'TransformerBlock': TransformerBlock,
        'ResidualCNNBlock' : ResidualCNNBlock
    }

    # ── 1. Load .keras ────────────────────────────────────────────
    try:
        model_keras = keras.models.load_model(
            os.path.join(CONFIG['SAVE_DIR'], CONFIG['MODEL_KERAS']),
            custom_objects=custom_objs
        )
        preds_keras = np.argmax(model_keras.predict(X_test[:10], verbose=0), axis=1)
        print(f' .keras loaded  — predictions: {preds_keras}')
    except Exception as e:
        print(f' .keras error: {e}')
        preds_keras = None

    # ── 2. Load .h5 ───────────────────────────────────────────────
    try:
        model_h5 = keras.models.load_model(
            os.path.join(CONFIG['SAVE_DIR'], CONFIG['MODEL_H5']),
            custom_objects=custom_objs,
            safe_mode=False
        )
        preds_h5 = np.argmax(model_h5.predict(X_test[:10], verbose=0), axis=1)
        print(f' .h5 loaded     — predictions: {preds_h5}')
    except Exception as e:
        print(f'  .h5 load failed ({e})')
        print('   → Trying weights-only approach...')
        try:
            # Rebuild architecture then load weights only
            model_h5_w = build_improved_transformer(
                input_length = CONFIG['WINDOW_SIZE'],
                num_classes  = CONFIG['NUM_CLASSES'],
                d_model      = CONFIG['D_MODEL'],
                num_heads    = CONFIG['NUM_HEADS'],
                num_layers   = CONFIG['NUM_LAYERS'],
                ff_dim       = CONFIG['FF_DIM'],
                dropout_rate = CONFIG['DROPOUT_RATE'],
            )
            model_h5_w.load_weights(
                os.path.join(CONFIG['SAVE_DIR'], CONFIG['MODEL_H5'])
            )
            preds_h5 = np.argmax(model_h5_w.predict(X_test[:10], verbose=0), axis=1)
            print(f' .h5 weights loaded — predictions: {preds_h5}')
        except Exception as e2:
            print(f' weights-only also failed: {e2}')
            preds_h5 = preds_keras  # fallback

    # ── 3. Compare ────────────────────────────────────────────────
    if preds_keras is not None and preds_h5 is not None:
        match = np.all(preds_keras == preds_h5)
        print(f'\n Predictions match between formats: {match}')

    # ── 4. Load label encoder ─────────────────────────────────────
    classes_loaded = np.load(
        os.path.join(CONFIG['SAVE_DIR'], CONFIG['LABEL_ENCODER']),
        allow_pickle=True
    )
    print(f' Label encoder loaded: {list(classes_loaded)}')

    # ─── Inference Utility ───────────────────────────────────────
    def predict_ecg_beat(signal_raw, model, label_encoder, fs=360, plot=True):
        """
        Predict a single ECG beat.
        """
        assert len(signal_raw) == 360, 'Signal must be exactly 360 samples'

        # Normalize
        std = np.std(signal_raw)
        if std < 1e-8:
            std = 1
        signal_norm = (signal_raw - np.mean(signal_raw)) / std

        # Predict
        proba = model.predict(signal_norm[np.newaxis, :], verbose=0)[0]
        pred_idx = np.argmax(proba)
        pred_label = label_encoder.inverse_transform([pred_idx])[0]

        result = {
            'label'       : pred_label,
            'confidence'  : float(proba[pred_idx]),
            'probabilities': {label_encoder.classes_[i]: float(proba[i])
                              for i in range(len(proba))}
        }

        if plot:
            fig, axes = plt.subplots(1, 2, figsize=(14, 4))
            fig.suptitle(f'ECG Beat Prediction: {pred_label} ({proba[pred_idx]:.1%})',
                         fontsize=13, fontweight='bold')

            axes[0].plot(signal_norm, color='steelblue', lw=1.5)
            axes[0].set_title('Input ECG Beat (normalized)')
            axes[0].set_xlabel('Samples')
            axes[0].set_ylabel('Amplitude')
            axes[0].grid(alpha=0.3)

            colors_bar = ['tomato' if i == pred_idx else 'steelblue'
                          for i in range(len(proba))]
            axes[1].bar(label_encoder.classes_, proba, color=colors_bar)
            axes[1].set_title('Class Probabilities')
            axes[1].set_ylabel('Probability')
            axes[1].set_ylim(0, 1.05)
            axes[1].tick_params(axis='x', rotation=15)
            for j, v in enumerate(proba):
                axes[1].text(j, v + 0.02, f'{v:.2%}', ha='center', fontsize=9)
            axes[1].grid(alpha=0.3, axis='y')

            plt.tight_layout()
            plt.show()

        return result


    # ─── Demo: predict 3 random test samples ─────────────────────
    print('\n Sample Predictions:\n')
    print('=' * 50)
    for i in range(3):
        idx = np.random.randint(len(X_test))
        result = predict_ecg_beat(X_test[idx], model, loader.label_encoder, plot=True)
        true_label = CLASS_NAMES[y_test[idx]]
        status = '✅ [MATCH]' if result['label'] == true_label else '❌ [MISMATCH]'
        print(f'{status} Sample {idx}: True={true_label} | Pred={result["label"]} ({result["confidence"]:.1%})')
        print(f'   Probabilities: {result["probabilities"]}')
        print('-' * 50)

    # ─── FINAL EVALUATION SUMMARY ───────────────────────────────
    from sklearn.metrics import accuracy_score, f1_score

    acc  = accuracy_score(y_test, y_pred)
    f1_w = f1_score(y_test, y_pred, average='weighted')
    f1_m = f1_score(y_test, y_pred, average='macro')

    print('\n' + '=' * 60)
    print('FINAL EVALUATION SUMMARY')
    print('=' * 60)
    print(f'  Test Accuracy         : {acc:.4f} ({acc*100:.2f}%)')
    print(f'  Weighted F1-Score     : {f1_w:.4f}')
    print(f'  Macro F1-Score        : {f1_m:.4f}')
    print(f'  Test Samples          : {len(X_test)}')
    print()
    print('  Per-Class Accuracy:')
    for cls_idx, cls_name in enumerate(CLASS_NAMES):
        mask = y_test == cls_idx
        cls_acc = accuracy_score(y_test[mask], y_pred[mask])
        print(f'    {cls_name:<15}: {cls_acc:.4f} ({cls_acc*100:.2f}%)')

    print()
    print('  Model Architecture:')
    print(f'    CNN Blocks         : 3 Residual blocks')
    print(f'    Transformer Blocks : {CONFIG["NUM_LAYERS"]}')
    print(f'    d_model            : {CONFIG["D_MODEL"]}')
    print(f'    Attention Heads    : {CONFIG["NUM_HEADS"]}')
    print(f'    Parameters         : {model.count_params():,}')

    print()
    print('  Saved Files:')
    for f in sorted(os.listdir(CONFIG['SAVE_DIR'])):
        print(f'   {f}')

    print()
    print('  XAI Methods Applied:')
    print('     Grad-CAM 1D        (gradient-based heatmap)')
    print('     Attention Weights  (transformer attention maps)')
    print('     SHAP KernelExplainer (feature attribution)')
    print('     LIME               (local linear approximation)')
    print('=' * 60)

except Exception as e:
    print(f"\n[ERREUR] : {e}")
