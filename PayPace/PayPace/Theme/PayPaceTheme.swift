import SwiftUI

enum PayPaceTheme {
    // Cream → soft mint (icon background)
    static let backgroundTop = Color(red: 0.996, green: 0.988, blue: 0.969) // #FEFCF7
    static let backgroundMid = Color(red: 0.949, green: 0.965, blue: 0.933) // #F2F6EE
    static let backgroundBottom = Color(red: 0.910, green: 0.890, blue: 0.851) // #E8E3D9
    static let surface = Color.white.opacity(0.78)

    // "Pay" ink
    static let ink = Color(red: 0.094, green: 0.165, blue: 0.133) // #182A22
    static let inkSecondary = Color(red: 0.353, green: 0.420, blue: 0.384) // #5A6B62

    // Progress greens from icon
    static let accent = Color(red: 0.176, green: 0.420, blue: 0.322) // #2D6B52
    static let accentMid = Color(red: 0.345, green: 0.667, blue: 0.478) // #58AA7A
    static let accentLight = Color(red: 0.694, green: 0.863, blue: 0.682) // #B1DCAE
    static let mint = Color(red: 0.914, green: 0.965, blue: 0.855) // #E9F6DA
    static let accentSoft = Color(red: 0.176, green: 0.420, blue: 0.322).opacity(0.14)

    static let warmHighlight = Color(red: 0.769, green: 0.710, blue: 0.627) // #C4B5A0
    static let danger = Color(red: 0.722, green: 0.318, blue: 0.278)
    static let success = Color(red: 0.345, green: 0.667, blue: 0.478)

    static var backgroundGradient: LinearGradient {
        LinearGradient(
            colors: [backgroundTop, backgroundMid, backgroundBottom],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    static var paceGradient: LinearGradient {
        LinearGradient(
            colors: [accent, accentMid, accentLight, mint],
            startPoint: .leading,
            endPoint: .trailing
        )
    }
}

struct PayPaceBackground: View {
    var body: some View {
        ZStack {
            PayPaceTheme.backgroundGradient
            Circle()
                .fill(PayPaceTheme.mint.opacity(0.55))
                .frame(width: 280, height: 280)
                .blur(radius: 30)
                .offset(x: 140, y: -200)
            Circle()
                .fill(PayPaceTheme.accentLight.opacity(0.35))
                .frame(width: 240, height: 240)
                .blur(radius: 40)
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
