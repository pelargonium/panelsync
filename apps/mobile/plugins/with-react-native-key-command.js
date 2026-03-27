const { withAppDelegate, createRunOncePlugin } = require('@expo/config-plugins');

function withReactNativeKeyCommand(config) {
  return withAppDelegate(config, (configWithDelegate) => {
    const mod = configWithDelegate.modResults;
    if (mod.language === 'objc' || mod.language === 'objcpp') {
      let contents = mod.contents;
      if (!contents.includes('#import <HardwareShortcuts.h>')) {
        contents = contents.replace('#import "AppDelegate.h"', '#import "AppDelegate.h"\n#import <HardwareShortcuts.h>');
      }
      if (!contents.includes('- (NSArray *)keyCommands')) {
        contents = contents.replace(
          '@end',
          `- (NSArray *)keyCommands
{
  return [HardwareShortcuts sharedInstance].keyCommands;
}

- (void)handleKeyCommand:(UIKeyCommand *)keyCommand
{
  [[HardwareShortcuts sharedInstance] handleKeyCommand:keyCommand];
}

@end`
        );
      }
      mod.contents = contents;
      return configWithDelegate;
    }

    if (mod.language === 'swift') {
      let contents = mod.contents;
      if (!contents.includes('func hardwareShortcutsInstance() -> NSObject?')) {
        contents = contents.replace(
          /}\s*$/,
          `
  func hardwareShortcutsInstance() -> NSObject? {
    guard
      let shortcutsClass = NSClassFromString("HardwareShortcuts") as? NSObject.Type,
      let shared = shortcutsClass.perform(NSSelectorFromString("sharedInstance"))?.takeUnretainedValue() as? NSObject
    else {
      return nil
    }
    return shared
  }

  override var keyCommands: [UIKeyCommand]? {
    guard
      let shortcuts = hardwareShortcutsInstance(),
      let commands = shortcuts.perform(NSSelectorFromString("keyCommands"))?.takeUnretainedValue() as? [UIKeyCommand]
    else {
      return super.keyCommands
    }
    return commands
  }

  @objc func handleKeyCommand(_ keyCommand: UIKeyCommand) {
    guard let shortcuts = hardwareShortcutsInstance() else { return }
    _ = shortcuts.perform(NSSelectorFromString("handleKeyCommand:"), with: keyCommand)
  }
}
`
        );
      }
      mod.contents = contents;
    }

    return configWithDelegate;
  });
}

module.exports = createRunOncePlugin(withReactNativeKeyCommand, 'with-react-native-key-command', '1.0.0');
