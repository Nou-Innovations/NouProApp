/**
 * AppDialogHost
 *
 * Mounted ONCE at the app root (inside ThemeProvider + SafeAreaProvider). It subscribes to
 * the dialog queue and renders the current request using the app's own components:
 *   - alert with 1–2 buttons / prompt  → AppModal (centered)
 *   - alert with 3+ buttons / actionSheet → AppBottomSheet (slide-up option list)
 *
 * Dialogs are pushed imperatively via `AppAlert` (src/shared/services/appAlert.ts).
 * Do not use this component directly.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  useDialogStore,
  type DialogButton,
  type DialogRequest,
} from '@/shared/store/dialogStore';
import AppModal, { type AppModalVariant } from './AppModal';
import AppBottomSheet, { type AppBottomSheetItem } from './AppBottomSheet';
import AppTextField from './AppTextField';

/**
 * Decide which button is the primary (highlighted) action and which is the cancel/secondary
 * for a 1–2 button alert, matching React Native's conventions: an explicit `cancel`-styled
 * button is the secondary; otherwise the LAST button is the highlighted primary.
 */
function splitButtons(buttons: DialogButton[]): {
  primary?: DialogButton;
  secondary?: DialogButton;
  cancel?: DialogButton;
} {
  const cancel = buttons.find((b) => b.style === 'cancel');
  if (buttons.length <= 1) {
    return { primary: buttons[0], secondary: undefined, cancel };
  }
  if (cancel) {
    const primary = buttons.find((b) => b !== cancel) ?? buttons[buttons.length - 1];
    return { primary, secondary: cancel, cancel };
  }
  return { primary: buttons[buttons.length - 1], secondary: buttons[0], cancel: undefined };
}

const isModalKind = (r: DialogRequest): boolean =>
  r.kind === 'prompt' || (r.kind === 'alert' && r.buttons.length <= 2);

const isSheetKind = (r: DialogRequest): boolean =>
  r.kind === 'actionSheet' || (r.kind === 'alert' && r.buttons.length >= 3);

export default function AppDialogHost() {
  const current = useDialogStore((s) => s.queue[0] ?? null);
  const dismissCurrent = useDialogStore((s) => s.dismissCurrent);

  // Retain the last request briefly so exit animations still have content to show after
  // the request is removed from the store.
  const [shown, setShown] = useState<DialogRequest | null>(current);
  const [promptValue, setPromptValue] = useState('');
  // Per-request guard so a button press and the component's follow-up onClose don't both fire.
  const resolvedRef = useRef<string | null>(null);

  useEffect(() => {
    if (current) {
      setShown(current);
      if (current.kind === 'prompt') setPromptValue(current.defaultValue ?? '');
      return;
    }
    const timer = setTimeout(() => setShown(null), 350);
    return () => clearTimeout(timer);
  }, [current]);

  // Resolve a dialog exactly once: dismiss it, then run the chosen action AFTER it closes
  // (so navigation/side-effects don't race the close animation). `reqId` binds the handler
  // to a specific request, ignoring late callbacks from an already-resolved/replaced dialog.
  const finish = (reqId: string, action?: () => void) => {
    if (resolvedRef.current === reqId) return;
    if (!current || current.id !== reqId) return;
    resolvedRef.current = reqId;
    dismissCurrent();
    if (action) setTimeout(action, 0);
  };

  const req = shown;
  if (!req) return null;

  const visible = !!current && current.id === req.id;

  // ---- AppModal: alert (≤2 buttons) or prompt -------------------------------------------
  if (isModalKind(req) && (req.kind === 'alert' || req.kind === 'prompt')) {
    const { primary, secondary, cancel } = splitButtons(req.buttons);
    const variant: AppModalVariant = primary?.style === 'destructive' ? 'delete' : 'default';
    const isPrompt = req.kind === 'prompt';

    return (
      <AppModal
        key={req.id}
        visible={visible}
        variant={variant}
        title={req.title}
        message={req.message}
        primaryButtonText={primary?.text ?? 'OK'}
        secondaryButtonText={secondary?.text}
        onPrimaryAction={() =>
          finish(req.id, () => primary?.onPress?.(isPrompt ? promptValue : undefined))
        }
        onSecondaryAction={secondary ? () => finish(req.id, () => secondary.onPress?.()) : undefined}
        onClose={() => {
          if (req.options?.cancelable === false) return;
          finish(req.id, () => {
            (cancel ?? secondary)?.onPress?.();
            req.options?.onDismiss?.();
          });
        }}
      >
        {isPrompt ? (
          <AppTextField
            label=""
            value={promptValue}
            onChangeText={setPromptValue}
            placeholder={req.placeholder}
            keyboardType={req.keyboardType}
            secureTextEntry={req.secureTextEntry}
            autoFocus
          />
        ) : undefined}
      </AppModal>
    );
  }

  // ---- AppBottomSheet: actionSheet or alert (3+ buttons) --------------------------------
  if (isSheetKind(req)) {
    let items: AppBottomSheetItem[] = [];
    let onSelect: (item: AppBottomSheetItem) => void = () => {};
    let onCancel: (() => void) | undefined;

    if (req.kind === 'actionSheet') {
      items = req.sheetOptions.map((o, i) => ({
        id: String(i),
        title: o.label,
        variant: o.destructive ? 'destructive' : 'default',
      }));
      onSelect = (item) => {
        const option = req.sheetOptions[Number(item.id)];
        finish(req.id, () => option?.onPress?.());
      };
      onCancel = () => {
        const c = req.sheetOptions.find((o) => o.cancel);
        finish(req.id, () => c?.onPress?.());
      };
    } else if (req.kind === 'alert') {
      items = req.buttons.map((b, i) => ({
        id: String(i),
        title: b.text ?? '',
        variant: b.style === 'destructive' ? 'destructive' : 'default',
      }));
      onSelect = (item) => {
        const button = req.buttons[Number(item.id)];
        finish(req.id, () => button?.onPress?.());
      };
      onCancel = () => {
        const c = req.buttons.find((b) => b.style === 'cancel');
        finish(req.id, () => c?.onPress?.());
      };
    }

    return (
      <AppBottomSheet
        key={req.id}
        visible={visible}
        title={req.title}
        subtitle={req.message}
        items={items}
        mode="buttons"
        onSelectItem={onSelect}
        onClose={() => onCancel?.()}
      />
    );
  }

  return null;
}
