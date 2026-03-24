import { Component, type ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface Props {
  children: ReactNode;
  onReset?: () => void;
  colors: { bg: string; text: string; muted: string; border: string };
  mono: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { colors, mono } = this.props;

    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontFamily: mono, fontSize: 14, color: colors.text, marginBottom: 8 }}>
          Something crashed.
        </Text>
        <Text style={{ fontFamily: mono, fontSize: 12, color: colors.muted, marginBottom: 24, textAlign: 'center' }}>
          {this.state.error?.message ?? 'Unknown error'}
        </Text>
        <TouchableOpacity
          onPress={this.handleReset}
          style={{ borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 8 }}
        >
          <Text style={{ fontFamily: mono, fontSize: 13, color: colors.text }}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}