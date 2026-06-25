/**
 * AppAlert — the app's imperative dialog API.
 *
 * Drop-in replacement for React Native's `Alert`, but renders the app's own on-brand
 * components (`AppModal` / `AppBottomSheet`) via `AppDialogHost` instead of the OS dialog.
 *
 * Usage mirrors `Alert` so migration is mechanical:
 *   AppAlert.alert('Title', 'Message');
 *   AppAlert.alert('Delete?', 'Cannot be undone', [
 *     { text: 'Cancel', style: 'cancel' },
 *     { text: 'Delete', style: 'destructive', onPress: doDelete },
 *   ]);
 *   AppAlert.prompt('Reason', 'Why?', (text) => submit(text));
 *
 * Plus an explicit action-sheet helper for menus of options:
 *   AppAlert.actionSheet({
 *     title: 'Add account',
 *     message: 'Create a new business or join an existing one.',
 *     options: [
 *       { label: 'Create new business', onPress: createBusiness },
 *       { label: 'Join existing business', onPress: joinBusiness },
 *       { label: 'Cancel', cancel: true },
 *     ],
 *   });
 *
 * Routing (handled by AppDialogHost): 1–2 buttons → centered AppModal; 3+ buttons or
 * actionSheet → AppBottomSheet; prompt → AppModal with a text field.
 */

import type { KeyboardTypeOptions } from 'react-native';
import {
  useDialogStore,
  type DialogButton,
  type DialogActionOption,
  type DialogExtraOptions,
} from '@/shared/store/dialogStore';

export type AppAlertButton = DialogButton;
/** Subset of RN's Alert.prompt `type` we honor (only secure-text changes behavior). */
export type AppPromptType = 'default' | 'plain-text' | 'secure-text' | 'login-password';

// Monotonic id generator — unique per request so the host can guard against stale handlers.
let counter = 0;
const nextId = (): string => `dlg-${(counter += 1)}`;

/** RN-compatible `Alert.alert`. */
function alert(
  title?: string,
  message?: string,
  buttons?: DialogButton[],
  options?: DialogExtraOptions,
): void {
  useDialogStore.getState().push({
    id: nextId(),
    kind: 'alert',
    title,
    message,
    buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }],
    options,
  });
}

/** RN-compatible `Alert.prompt`. The confirm button's `onPress` receives the entered text. */
function prompt(
  title?: string,
  message?: string,
  callbackOrButtons?: ((text: string) => void) | DialogButton[],
  type?: AppPromptType,
  defaultValue?: string,
  keyboardType?: KeyboardTypeOptions,
): void {
  let buttons: DialogButton[];
  if (typeof callbackOrButtons === 'function') {
    const cb = callbackOrButtons;
    buttons = [{ text: 'OK', onPress: (value) => cb(value ?? '') }];
  } else if (Array.isArray(callbackOrButtons) && callbackOrButtons.length > 0) {
    buttons = callbackOrButtons;
  } else {
    buttons = [{ text: 'OK' }];
  }

  useDialogStore.getState().push({
    id: nextId(),
    kind: 'prompt',
    title,
    message,
    buttons,
    defaultValue,
    keyboardType,
    secureTextEntry: type === 'secure-text' || type === 'login-password',
  });
}

export interface ActionSheetConfig {
  title?: string;
  message?: string;
  options: DialogActionOption[];
}

/** Explicit action sheet — a slide-up list of tappable options. */
function actionSheet({ title, message, options }: ActionSheetConfig): void {
  useDialogStore.getState().push({
    id: nextId(),
    kind: 'actionSheet',
    title,
    message,
    sheetOptions: options,
  });
}

export const AppAlert = { alert, prompt, actionSheet };

export default AppAlert;
