import SwiftUI
import Combine

struct GameView: View {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var model: GameViewModel

    init(level: Level, phrases: [Phrase], container: AppContainer) {
        let mode = PlayMode(rawValue: UserDefaults.standard.string(forKey: "play-mode") ?? "") ?? .standard
        _model = StateObject(wrappedValue: GameViewModel(
            level: level,
            phrases: phrases,
            initialCollection: container.progress.collection,
            initialInk: container.progress.ink,
            playMode: mode,
            persist: { try container.persist(gameState: $0) },
            spendInk: { try container.spendInk(for: $0) }
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
                            hintCoordinates: model.hintCoordinates,
                            onSelection: model.select
                        )
                    } else {
                        CrossBoardView(
                            level: model.level,
                            targets: model.targets,
                            foundPhraseIDs: model.state.foundPhraseIDs,
                            hintCoordinates: model.hintCoordinates,
                            selectedPhraseID: $model.selectedCrossPhraseID
                        )
                        AnswerInputView(
                            answer: $model.answer,
                            enabled: model.selectedCrossPhraseID != nil,
                            submit: model.submitCrossAnswer
                        )
                    }
                    hintBar
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
            } else if model.state.phase == .timedOut {
                timeoutView
            }
        }
        .navigationTitle("第 \(model.level.id) 關")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: knowledgeBinding) { phrase in
            KnowledgeCardView(phrase: phrase)
                .presentationDetents([.medium, .large])
        }
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
            model.tick(milliseconds: 1_000)
        }
        .onChange(of: scenePhase) { phase in
            model.setBackgrounded(phase != .active)
        }
    }

    private var progressHeader: some View {
        HStack {
            Label(
                "\(model.state.foundPhraseIDs.count) / \(model.state.targetPhraseIDs.count)",
                systemImage: "seal"
            )
            Spacer()
            if let remaining = model.state.remainingMilliseconds {
                Label(format(milliseconds: remaining), systemImage: "hourglass")
                    .monospacedDigit()
            }
            Spacer()
            Label("失誤 \(model.state.mistakes)", systemImage: "exclamationmark.circle")
        }
        .font(.headline)
        .foregroundStyle(AppTheme.secondaryText)
    }

    private var hintBar: some View {
        VStack(spacing: 10) {
            HStack {
                Label("\(model.ink) 墨", systemImage: "drop.fill")
                Spacer()
                Text("\(model.modeConfiguration.label)・提示 \(model.state.hintsUsed) / \(model.modeConfiguration.hintCap ?? 99)")
            }
            .font(.subheadline.bold())
            .foregroundStyle(AppTheme.secondaryText)
            HStack(spacing: 8) {
                hintButton("借一字", tier: .circle, symbol: "scope")
                hintButton("借一句", tier: .flash, symbol: "sparkles")
                hintButton("仙人代筆", tier: .reveal, symbol: "wand.and.stars")
            }
        }
        .padding()
        .background(Color.white.opacity(0.07), in: RoundedRectangle(cornerRadius: 14))
    }

    private func hintButton(_ title: String, tier: HintTier, symbol: String) -> some View {
        Button {
            model.useHint(tier)
        } label: {
            VStack(spacing: 4) {
                Label(title, systemImage: symbol)
                    .font(.caption.bold())
                Text("\(HintEngine.cost(of: tier)) 墨")
                    .font(.caption2)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.bordered)
        .disabled(model.state.phase != .running)
    }

    private var timeoutView: some View {
        VStack(spacing: 16) {
            Image(systemName: "hourglass.bottomhalf.filled")
                .font(.system(size: 50))
                .foregroundStyle(AppTheme.accent)
            Text("時辰已盡")
                .font(.largeTitle.bold())
            Text("本局進度會重置，已收入摘句集的真言仍會保留。")
                .multilineTextAlignment(.center)
                .foregroundStyle(AppTheme.secondaryText)
            Button("再試一次", action: model.retry)
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.accent)
        }
        .foregroundStyle(AppTheme.primaryText)
        .padding(28)
        .frame(maxWidth: 420)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24))
        .padding()
        .accessibilityIdentifier("timeout-view")
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

    private func format(milliseconds: Int) -> String {
        let seconds = max(0, milliseconds / 1_000)
        return String(format: "%02d:%02d", seconds / 60, seconds % 60)
    }
}
