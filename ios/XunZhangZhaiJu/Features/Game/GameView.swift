import SwiftUI

struct GameView: View {
    @StateObject private var model: GameViewModel

    init(level: Level, phrases: [Phrase], container: AppContainer) {
        _model = StateObject(wrappedValue: GameViewModel(
            level: level,
            phrases: phrases,
            initialCollection: container.progress.collection,
            persist: { try container.persist(gameState: $0) }
        ))
    }

    var body: some View {
        ZStack {
            AppTheme.background.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 18) {
                    progressHeader
                    if model.level.layout == .full {
                        FullBoardView(
                            grid: model.level.grid,
                            foundPaths: foundPaths,
                            onSelection: model.select
                        )
                    } else {
                        CrossBoardView(
                            level: model.level,
                            targets: model.targets,
                            foundPhraseIDs: model.state.foundPhraseIDs,
                            selectedPhraseID: $model.selectedCrossPhraseID
                        )
                        AnswerInputView(
                            answer: $model.answer,
                            enabled: model.selectedCrossPhraseID != nil,
                            submit: model.submitCrossAnswer
                        )
                    }
                    clueList
                    if let message = model.errorMessage {
                        Text(message)
                            .foregroundStyle(Color.orange)
                            .accessibilityIdentifier("game-error")
                    }
                }
                .padding()
            }
            if model.state.phase == .completed {
                CompletionView(stars: model.state.earnedStars ?? 0)
            }
        }
        .navigationTitle("第 \(model.level.id) 關")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: knowledgeBinding) { phrase in
            KnowledgeCardView(phrase: phrase)
                .presentationDetents([.medium, .large])
        }
    }

    private var progressHeader: some View {
        HStack {
            Label(
                "\(model.state.foundPhraseIDs.count) / \(model.state.targetPhraseIDs.count)",
                systemImage: "seal"
            )
            Spacer()
            Label("失誤 \(model.state.mistakes)", systemImage: "exclamationmark.circle")
        }
        .font(.headline)
        .foregroundStyle(AppTheme.secondaryText)
    }

    private var clueList: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("本關線索")
                .font(.headline)
            ForEach(model.targets, id: \.target.phraseID) { item in
                let found = model.state.foundPhraseIDs.contains(item.phrase.id)
                Text(found ? "✓ \(item.phrase.text)" : "• \(item.phrase.clues[item.target.clueIndex].text)")
                    .foregroundStyle(found ? AppTheme.accent : AppTheme.primaryText)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(Color.white.opacity(0.07), in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private var foundPaths: [[GridCoordinate]] {
        model.targets.compactMap { item in
            guard model.state.foundPhraseIDs.contains(item.phrase.id) else { return nil }
            return NativeParityRules.targetPath(
                start: item.target.start,
                direction: item.target.direction,
                length: item.phrase.text.count,
                size: model.level.size
            )
        }
    }

    private var knowledgeBinding: Binding<Phrase?> {
        Binding(
            get: { model.knowledgePhrase },
            set: { if $0 == nil { model.dismissKnowledge() } }
        )
    }
}
