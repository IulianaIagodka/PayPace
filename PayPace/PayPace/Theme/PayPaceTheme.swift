import SwiftUI

enum PayPaceTheme {
    static let backgroundTop = Color(red: 0.97, green: 0.95, blue: 0.91)
    static let backgroundBottom = Color(red: 0.91, green: 0.94, blue: 0.92)
    static let surface = Color.white.opacity(0.72)
    static let ink = Color(red: 0.18, green: 0.20, blue: 0.19)
    static let inkSecondary = Color(red: 0.42, green: 0.45, blue: 0.43)
    static let accent = Color(red: 0.22, green: 0.48, blue: 0.42)
    static let accentSoft = Color(red: 0.22, green: 0.48, blue: 0.42).opacity(0.12)
    static let warmHighlight = Color(red: 0.86, green: 0.62, blue: 0.38)
    static let danger = Color(red: 0.72, green: 0.32, blue: 0.28)
    static let success = Color(red: 0.28, green: 0.55, blue: 0.42)

    static var backgroundGradient: LinearGradient {
        LinearGradient(
            colors: [backgroundTop, backgroundBottom, Color(red: 0.94, green: 0.93, blue: 0.88)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

struct PayPaceBackground: View {
    var body: some View {
        ZStack {
            PayPaceTheme.backgroundGradient
            Circle()
                .fill(PayPaceTheme.accent.opacity(0.08))
                .frame(width: 320, height: 320)
                .blur(radius: 40)
                .offset(x: 140, y: -220)
            Circle()
                .fill(PayPaceTheme.warmHighlight.opacity(0.10))
                .frame(width: 280, height: 280)
                .blur(radius: 50)
                .offset(x: -160, y: 280)
        }
        .ignoresSafeArea()
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    var isEnabled: Bool = true

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(.body, design: .rounded).weight(.semibold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(isEnabled ? PayPaceTheme.accent : PayPaceTheme.accent.opacity(0.35))
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(.body, design: .rounded).weight(.semibold))
            .foregroundStyle(PayPaceTheme.accent)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(PayPaceTheme.accentSoft)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct SoftFieldBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color.white.opacity(0.78))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(PayPaceTheme.ink.opacity(0.06), lineWidth: 1)
            )
    }
}

extension View {
    func softField() -> some View {
        modifier(SoftFieldBackground())
    }
}
