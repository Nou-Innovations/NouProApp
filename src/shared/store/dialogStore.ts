/**
 * Dialog Store
 * Backs the app-wide imperative dialog API (`AppAlert`). Holds a FIFO queue of dialog
 * requests so that, like the native `Alert`, stacked dialogs are shown one after another.
 *
 * The current dialog is always `queue[0]`. `AppDialogHost` (mounted once at the app root)
 * subscribes to this store and renders it as an `AppModal` or `AppBottomSheet`.
 *
 * This store has NO React dependency, so `AppAlert` can be called from anywhere —
 * screens, hooks, and plain services (e.g. imageService.ts) alike.
 */

import { create } from 'zustand';
import type { KeyboardTypeOptions } from 'react-native';

/** Mirrors React Native's Alert button styles. */
export type AlertButtonStyle = 'default' | 'cancel' | 'destructive';

/** A button in an alert/prompt. `onPress` receives the entered text for prompts. */
export interface DialogButton {
  text?: string;
  onPress?: (value?: string) => void;
  style?: AlertButtonStyle;
}

/** An option in an action sheet (vertical list of choices). */
export interface DialogActionOption {
  label: string;
  onPress?: () => void;
  /** Renders with the destructive (red) color. */
  destructive?: boolean;
  /** Marks this as the cancel/dismiss option. */
  cancel?: boolean;
}

/** Mirrors React Native's Alert third-arg options. */
export interface DialogExtraOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

interface BaseRequest {
  id: string;
  title?: string;
  message?: string;
  options?: DialogExtraOptions;
}

export interface AlertRequest extends BaseRequest {
  kind: 'alert';
  buttons: DialogButton[];
}

export interface PromptRequest extends BaseRequest {
  kind: 'prompt';
  buttons: DialogButton[];
  defaultValue?: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
}

export interface ActionSheetRequest extends BaseRequest {
  kind: 'actionSheet';
  sheetOptions: DialogActionOption[];
}

export type DialogRequest = AlertRequest | PromptRequest | ActionSheetRequest;

interface DialogState {
  /** FIFO queue of pending dialogs. The visible one is always `queue[0]`. */
  queue: DialogRequest[];
  /** Enqueue a dialog (shown immediately if nothing is currently displayed). */
  push: (req: DialogRequest) => void;
  /** Remove the currently-visible dialog, promoting the next queued one. */
  dismissCurrent: () => void;
  /** Drop every queued dialog (used on logout / hard resets). */
  clear: () => void;
}

export const useDialogStore = create<DialogState>((set) => ({
  queue: [],
  push: (req) => set((state) => ({ queue: [...state.queue, req] })),
  dismissCurrent: () => set((state) => ({ queue: state.queue.slice(1) })),
  clear: () => set({ queue: [] }),
}));
