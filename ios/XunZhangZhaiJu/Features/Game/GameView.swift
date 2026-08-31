import SwiftUI
import Combine

struct GameView: View {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var model: GameViewModel
    @State private var eventToShow: WorldEvent?
    @FocusState private var answerFocused: Bool
    private let chapter: StoryLore.Chapter?
    private let chooseEvent: (WorldEvent, EventChoice) throws -> Void

    init(
        level: Level,
        phrases: [Phrase],
        container: AppContainer,
        chapter: StoryLore.Chapter? = nil,
        event: WorldEvent? = nil
    ) {
        let mode = PlayMode(rawValue: UserDefaults.standard.string(forKey: "play-mode") ?? "") ?? .standard
        let eventSeen = event.map { container.progress.world?.eventsSeen.contains($0.id) == true } ?? true
        self.chapter = chapter
        _eventToShow = State(initialValue: eventSeen ? nil : event)
        chooseEvent = { try container.applyWorldEvent($0, choice: $1) }
        _model = StateObject(wrappedValue: GameViewModel(
            level: level,
            phrases: phrases,
            initialCollection: container.progress.collection,
            initialInk: container.progress.ink,
            playMode: mode,
            savedRun: container.progress.activeRun,
            persist: { try container.persist(gameState: $0) },
            spendInk: { try container.spendInk(for: $0) }
        ))
    }

    var body: some View {
        ZStack {
            AppTheme.background.ignoresSafeArea()
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: 18) {
                        progressHeader
                        missionPanel
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
                                isFocused: $answerFocused,
                                enabled: model.selectedCrossPhraseID != nil,
                                submit: model.submitCrossAnswer
                            )
                            .id("cross-answer-anchor")
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
                .onChange(of: model.selectedCrossPhraseID) { selectedID in
                    guard selectedID != nil else { return }
                    withAnimation {
                        proxy.scrollTo("cross-answer-anchor", anchor: .center)
                    }
                    answerFocused = true
                }
            }
            if model.state.phase == .completed {
                CompletionView(stars: model.state.earnedStars ?? 0)
            } else if model.state.phase == .timedOut {
                timeoutView
            }
        }
        .navigationTitle("第 \(model.level.id) 關")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        .sheet(item: knowledgeBinding) { phrase in
            KnowledgeCardView(phrase: phrase)
                .presentationDetents([.medium, .large])
        }
        .sheet(item: $eventToShow) { event in
            WorldEventView(event: event) { choice in
                try chooseEvent(event, choice)
            }
            .presentationDetents([.medium, .large])
        }
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
            model.tick(milliseconds: 1_000)
        }
        .onChange(of: scenePhase) { phase in
            model.setBackgrounded(phase != .active)
        }
        .onAppear { model.saveRunIfNeeded() }
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

    private var missionPanel: some View {
        HStack(alignment: .top, spacing: 14) {
            if let guardian = GuardianPresentation.forChapter(model.level.chapter) {
                Image(guardian.assetName)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 88, height: 88)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .accessibilityLabel("守護神，\(guardian.name)")
            } else {
                Image(systemName: "scroll.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(AppTheme.accent)
                    .frame(width: 88, height: 88)
                    .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
                    .accessibilityHidden(true)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text(GuardianPresentation.forChapter(model.level.chapter)?.name ?? "文林引路人")
                    .font(.headline)
                    .foregroundStyle(AppTheme.accent)
                Text("學習目標")
                    .font(.caption.bold())
                    .foregroundStyle(AppTheme.secondaryText)
                Text(learningGoal)
                    .font(.subheadline)
                    .foregroundStyle(AppTheme.primaryText)
                    .fixedSize(horizontal: false, vertical: true)
                if let guidance = chapter?.intro.last {
                    Text(guidance)
                        .font(.caption)
                        .foregroundStyle(AppTheme.secondaryText)
                        .lineLimit(3)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(AppTheme.surface, in: RoundedRectangle(cornerRadius: 18))
        .accessibilityIdentifier("game-mission")
    }

    private var learningGoal: String {
        let verb = model.level.layout == .full ? "從字陣中辨識" : "依線索判讀並填入"
        return "\(verb) \(model.targets.count) 則完整真言，理解字詞與語境的連結。"
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
                if model.level.layout == .cross {
                    Button {
                        model.selectedCrossPhraseID = item.phrase.id
                    } label: {
                        clueLabel(item: item, found: found)
                    }
                    .buttonStyle(.plain)
                    .disabled(found)
                    .accessibilityIdentifier("clue-\(item.phrase.id)")
                    .accessibilityHint(found ? "已完成" : "點兩下選擇此題並輸入答案")
                } else {
                    clueLabel(item: item, found: found)
                }
            }
        }
    }

    private func clueLabel(item: (target: LevelTarget, phrase: Phrase), found: Bool) -> some View {
        let selected = model.selectedCrossPhraseID == item.phrase.id
        return Text(found ? "✓ \(item.phrase.text)" : "• \(item.phrase.clues[item.target.clueIndex].text)")
            .foregroundStyle(found ? AppTheme.accent : AppTheme.primaryText)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(Color.white.opacity(selected ? 0.16 : 0.07), in: RoundedRectangle(cornerRadius: 12))
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .stroke(selected ? AppTheme.accent : Color.clear, lineWidth: 2)
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

private struct GuardianPresentation {
    let name: String
    let assetName: String

    static func forChapter(_ chapter: Int) -> GuardianPresentation? {
        switch chapter {
        case 1: GuardianPresentation(name: "姜太公", assetName: "GuardianJiangTaigong")
        case 2: GuardianPresentation(name: "哪吒", assetName: "GuardianNezha")
        case 3: GuardianPresentation(name: "楊戩", assetName: "GuardianYangJian")
        case 4: GuardianPresentation(name: "蘇妲己", assetName: "GuardianSuDaji")
        case 5: GuardianPresentation(name: "雷震子", assetName: "GuardianLeiZhenzi")
        default: nil
        }
    }
}
