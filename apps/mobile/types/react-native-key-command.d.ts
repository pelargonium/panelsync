declare module 'react-native-key-command' {
  export type KeyCommandRegistration = {
    input: string;
    modifierFlags?: number;
  };

  export type KeyCommandEvent = {
    input: string;
    modifierFlags?: number;
  };

  export const constants: Record<string, number | string>;

  export function registerKeyCommands(commands: KeyCommandRegistration[]): Promise<void> | void;
  export function unregisterKeyCommands(commands: KeyCommandRegistration[]): Promise<void> | void;

  export const eventEmitter: {
    addListener(
      eventName: 'onKeyCommand',
      callback: (payload: KeyCommandEvent) => void
    ): { remove: () => void };
  };
}
