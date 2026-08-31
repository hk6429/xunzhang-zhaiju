import SwiftUI

struct CollectionView: View {
    @EnvironmentObject private var container: AppContainer
    @State private var searchText = ""

    var body: some View {
        Group {
            if collectedPhrases.isEmpty {
                VStack(spacing: 16) {
                    Image("CollectionHeroes")
                        .resizable()
                        .scaledToFit()
                        .clipShape(RoundedRectangle(cornerRadius: 22))
                    Text("摘句集還是空的")
                        .font(.title2.bold())
                    Text("親手找出的真言會收進這裡；請仙人直接揭示的句子，要下次自己破解才算收藏。")
                        .multilineTextAlignment(.center)
                        .foregroundStyle(AppTheme.secondaryText)
                }
                .padding()
            } else {
                List(filteredPhrases) { phrase in
                    NavigationLink {
                        KnowledgeCardView(phrase: phrase)
                    } label: {
                        VStack(alignment: .leading, spacing: 5) {
                            Text(phrase.text)
                                .font(.headline)
                            Text("\(phrase.type.rawValue)・\(phrase.meaning)")
                                .font(.subheadline)
                                .lineLimit(2)
                        }
                    }
                }
                .scrollContentBackground(.hidden)
                .searchable(text: $searchText, prompt: "搜尋摘句、作者或朝代")
            }
        }
        .foregroundStyle(AppTheme.primaryText)
        .background(AppTheme.background)
        .navigationTitle("摘句集")
    }

    private var collectedPhrases: [Phrase] {
        guard let phrases = container.content?.phrases else { return [] }
        let order = Dictionary(uniqueKeysWithValues: container.progress.collection.enumerated().map { ($0.element, $0.offset) })
        return phrases.filter { order[$0.id] != nil }.sorted { order[$0.id, default: 0] < order[$1.id, default: 0] }
    }

    private var filteredPhrases: [Phrase] {
        guard !searchText.isEmpty else { return collectedPhrases }
        return collectedPhrases.filter {
            [$0.text, $0.meaning, $0.author ?? "", $0.dynasty ?? ""]
                .contains { $0.localizedCaseInsensitiveContains(searchText) }
        }
    }
}
