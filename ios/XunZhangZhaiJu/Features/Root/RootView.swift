import SwiftUI

enum AppSection: String, CaseIterable, Identifiable {
    case journey
    case daily
    case collection
    case profile

    var id: Self { self }

    var title: String {
        switch self {
        case .journey: "修煉山河"
        case .daily: "今日修煉"
        case .collection: "摘句集"
        case .profile: "我的"
        }
    }

    var systemImage: String {
        switch self {
        case .journey: "map"
        case .daily: "sun.max"
        case .collection: "books.vertical"
        case .profile: "person.crop.circle"
        }
    }
}

struct RootView: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var selection: AppSection = .journey

    var body: some View {
        if horizontalSizeClass == .regular {
            NavigationSplitView {
                List {
                    ForEach(AppSection.allCases) { section in
                        Button {
                            selection = section
                        } label: {
                            Label(section.title, systemImage: section.systemImage)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .buttonStyle(.plain)
                        .foregroundStyle(selection == section ? AppTheme.accent : AppTheme.primaryText)
                        .accessibilityAddTraits(selection == section ? .isSelected : [])
                    }
                }
                .navigationTitle("尋章摘句")
            } detail: {
                sectionView(selection)
            }
        } else {
            TabView(selection: $selection) {
                ForEach(AppSection.allCases) { section in
                    sectionView(section)
                        .tabItem {
                            Label(section.title, systemImage: section.systemImage)
                        }
                        .tag(section)
                }
            }
        }
    }

    @ViewBuilder
    private func sectionView(_ section: AppSection) -> some View {
        NavigationStack {
            switch section {
            case .journey:
                JourneyView()
            case .daily:
                DailyView()
            case .collection:
                CollectionView()
            case .profile:
                ProfileView()
            }
        }
    }
}

#Preview {
    RootView()
        .environmentObject(AppContainer())
}
