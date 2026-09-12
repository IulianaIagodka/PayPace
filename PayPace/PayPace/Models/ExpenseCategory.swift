import Foundation

enum ExpenseCategory: String, Codable, CaseIterable, Identifiable {
    case rent
    case utilities
    case subscriptions
    case loan
    case childcare
    case groceries
    case transport
    case food
    case other

    var id: String { rawValue }

    var title: String {
        switch self {
        case .rent: return "Rent"
        case .utilities: return "Utilities"
        case .subscriptions: return "Subscriptions"
        case .loan: return "Loan"
        case .childcare: return "Childcare"
        case .groceries: return "Groceries"
        case .transport: return "Transport"
        case .food: return "Food & drink"
        case .other: return "Other"
        }
    }

    var systemImage: String {
        switch self {
        case .rent: return "house.fill"
        case .utilities: return "bolt.fill"
        case .subscriptions: return "play.rectangle.fill"
        case .loan: return "creditcard.fill"
        case .childcare: return "figure.and.child.holdinghands"
        case .groceries: return "cart.fill"
        case .transport: return "bus.fill"
        case .food: return "cup.and.saucer.fill"
        case .other: return "circle.fill"
        }
    }

    /// Categories suggested for mandatory bills before payday.
    static var mandatorySuggestions: [ExpenseCategory] {
        [.rent, .utilities, .subscriptions, .loan, .childcare, .groceries, .transport, .other]
    }
}
