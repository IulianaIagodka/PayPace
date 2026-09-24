import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { hudType } from '../theme/hud';
import { HudButton } from './ui';

type Props = { children: React.ReactNode };

type State = { error: Error | null };

/** Catches render crashes so a bad screen doesn’t white-out the whole app. */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.root}>
          <ScrollView contentContainerStyle={styles.pad}>
            <Text style={styles.title}>SOMETHING BROKE</Text>
            <Text style={styles.sub}>{this.state.error.message}</Text>
            <HudButton title="TRY AGAIN" onPress={this.reset} />
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 14 },
  title: { ...hudType.screenTitle },
  sub: { ...hudType.body },
});
