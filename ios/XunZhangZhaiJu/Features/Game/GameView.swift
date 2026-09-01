import SwiftUI
import Combine
import UIKit

struct GameView: View {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var model: GameViewModel
    @State private var eventToShow: WorldEvent?
    @State private var quizQuestions: [LearningQuestion] = []
    @State private var pendingEventStudyQuestions: [LearningQuestion] = []
    @State private var quizPresented = false
    @FocusState private var answerFocused: Bool
    private let chapter: StoryLore.Chapter?
    private let chooseEvent: (WorldEvent, EventChoice) throws -> Int
    private let buildEventStudyQuestions: (Int) -> [LearningQuestion]
    private let recordQuiz: (LearningQuestion, Bool) throws -> Int
    private let previewsEventEffects: Bool
    private let recordEventChoicePreview: () throws -> Void

    init(
        level: Level,
        phrases: [Phrase],
        container: AppContainer,
        chapter: StoryLore.Chapter? = nil,
        event: WorldEvent? = nil
    ) {
        let mode = PlayMode(rawValue: UserDefaults.standard.string(forKey: "play-mode") ?? "") ?? .standard
        let eventSeen = event.map { container.progress.world?.eventsSeen.contains($0.id) == true } ?? true
        let passiveBonuses = TreasurePassiveEngine().bonuses(in: container.progress)
        let previewsEventEffects = event != nil && container.content.map {
            TreasureAbilityEngine().canPreviewEventChoices(
                dateKey: TaiwanDate.dateKey(),
                progress: container.progress,
                story: $0.story
            )
        } == true
        self.chapter = chapter
        self.previewsEventEffects = previewsEventEffects
        _eventToShow = State(initialValue: eventSeen ? nil : event)
        chooseEvent = { try container.applyWorldEvent($0, choice: $1) }
        recordEventChoicePreview = { try container.recordEventChoicePreview() }
        buildEventStudyQuestions = { count in
            LearningQuizEngine().buildStudyQuestions(
                phrases: phrases,
                progress: container.progress,
                dateKey: TaiwanDate.dateKey(),
                count: count,
                randomValues: Array(repeating: 0.37, count: max(1, count) * 8)
            )
        }
        recordQuiz = { question, correct in
            let inkBefore = container.progress.ink
            try container.recordQuiz(
                phraseID: question.phraseID,
                kind: question.kind,
                correct: correct
            )
            return max(0, container.progress.ink - inkBefore)
        }
        _model = StateObject(wrappedValue: GameViewModel(
            level: level,
            phrases: phrases,
            initialCollection: container.progress.collection,
            initialInk: container.progress.ink,
            playMode: mode,
            savedRun: container.progress.activeRun,
            passiveBonuses: passiveBonuses,
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
        .sheet(item: $eventToShow, onDismiss: finishWorldEventPresentation) { event in
            WorldEventView(event: event, previewsEffects: previewsEventEffects) { choice in
                let studyCount = try chooseEvent(event, choice)
                pendingEventStudyQuestions = buildEventStudyQuestions(studyCount)
            }
            .presentationDetents([.medium, .large])
        }
        .sheet(isPresented: $quizPresented, onDismiss: {
            model.setLearningQuizPresented(false)
        }) {
            GameLearningQuizView(
                questions: quizQuestions,
                startingInk: model.ink,
                extraChoiceSecondChances: model.passiveBonuses.secondChances,
                submit: { question, correct in
                    let earned = try recordQuiz(question, correct)
                    model.refreshInk(model.ink + earned)
                    return earned
                }
            )
        }
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
            model.advanceClock()
        }
        .onChange(of: scenePhase) { phase in
            model.setBackgrounded(phase != .active)
        }
        .onChange(of: model.state.foundPhraseIDs.count) { _ in
            NativeGameFeedback.success()
        }
        .onChange(of: model.state.mistakes) { _ in
            NativeGameFeedback.error()
        }
        .onAppear {
            model.setWorldEventPresented(eventToShow != nil)
            if eventToShow != nil, previewsEventEffects {
                try? recordEventChoicePreview()
            }
            model.saveRunIfNeeded()
        }
    }

    private var progressHeader: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Label(
                    "\(model.state.foundPhraseIDs.count) / \(model.state.targetPhraseIDs.count)",
                    systemImage: "seal"
                )
                Spacer()
                if let remaining = model.state.remainingMilliseconds {
                    Label(format(milliseconds: remaining), systemImage: "hourglass")
                        .monospacedDigit()
                    Spacer()
                }
                Label("失誤 \(model.state.mistakes)", systemImage: "exclamationmark.circle")
            }
            if model.comboIsActive {
                Label("\(model.comboCount) 連擊", systemImage: "bolt.fill")
                    .foregroundStyle(AppTheme.accent)
                    .accessibilityIdentifier("game-combo")
            }
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
            Button {
                openLearningQuiz()
            } label: {
                Label("研墨答題", systemImage: "book.closed.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(AppTheme.accent)
            .disabled(model.state.phase != .running || !model.state.pauseReasons.isEmpty)
            .accessibilityIdentifier("open-learning-quiz")
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

    private func openLearningQuiz() {
        let questions = LearningQuizEngine().buildQuestions(
            phrases: Array(model.phrasesByID.values),
            targetPhraseIDs: model.targets.map(\.phrase.id),
            count: min(5, model.targets.count)
        )
        guard !questions.isEmpty else { return }
        quizQuestions = questions
        model.setLearningQuizPresented(true)
        guard model.state.phase == .running else { return }
        quizPresented = true
    }

    private func finishWorldEventPresentation() {
        model.setWorldEventPresented(false)
        guard !pendingEventStudyQuestions.isEmpty else { return }
        quizQuestions = pendingEventStudyQuestions
        pendingEventStudyQuestions = []
        model.setLearningQuizPresented(true)
        quizPresented = true
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
        return VStack(alignment: .leading, spacing: 5) {
            if found {
                Text("✓ \(item.phrase.text)")
            } else {
                ForEach(Array(model.clueTexts(for: item).enumerated()), id: \.offset) { index, clue in
                    Text(index == 0 ? "• \(clue)" : "法寶線索：\(clue)")
                        .font(index == 0 ? .body : .caption)
                }
            }
        }
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

struct GameLearningQuizView: View {
    @Environment(\.dismiss) private var dismiss
    @FocusState private var fillFocused: Bool
    @State private var index = 0
    @State private var fillAnswer = ""
    @State private var feedback = ""
    @State private var answered = false
    @State private var earnedInk = 0
    @State private var currentInk: Int
    @State private var disabledChoiceOptions: Set<String> = []
    @State private var choiceSecondChancesUsed = 0

    let questions: [LearningQuestion]
    let title: String
    let returnLabel: String
    let extraChoiceSecondChances: Int
    let submit: (LearningQuestion, Bool) throws -> Int

    init(
        questions: [LearningQuestion],
        startingInk: Int,
        title: String = "研墨檯",
        returnLabel: String = "返回字陣",
        extraChoiceSecondChances: Int = 0,
        submit: @escaping (LearningQuestion, Bool) throws -> Int
    ) {
        self.questions = questions
        self.title = title
        self.returnLabel = returnLabel
        self.extraChoiceSecondChances = max(0, extraChoiceSecondChances)
        self.submit = submit
        _currentInk = State(initialValue: startingInk)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AppTheme.background.ignoresSafeArea()
                ScrollViewReader { proxy in
                    ScrollView {
                        VStack(spacing: 20) {
                            progress
                            if questions.indices.contains(index) {
                                questionView(questions[index], proxy: proxy)
                            } else {
                                completion
                            }
                        }
                        .foregroundStyle(AppTheme.primaryText)
                        .frame(maxWidth: 620)
                        .padding(24)
                        .frame(maxWidth: .infinity)
                    }
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("暫離研墨") { dismiss() }
                }
            }
        }
        .interactiveDismissDisabled(index < questions.count && answered)
        .accessibilityIdentifier("game-learning-quiz")
    }

    private var progress: some View {
        VStack(spacing: 8) {
            HStack {
                Label("\(currentInk) 墨", systemImage: "drop.fill")
                Spacer()
                Text(index < questions.count ? "第 \(index + 1) / \(questions.count) 題" : "研墨完成")
            }
            .font(.headline)
            ProgressView(value: Double(min(index, questions.count)), total: Double(max(1, questions.count)))
                .tint(AppTheme.accent)
                .accessibilityHidden(true)
        }
        .foregroundStyle(AppTheme.secondaryText)
    }

    @ViewBuilder
    private func questionView(_ question: LearningQuestion, proxy: ScrollViewProxy) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "book.pages.fill")
                .font(.system(size: 42))
                .foregroundStyle(AppTheme.accent)
                .accessibilityHidden(true)
            Text(question.prompt)
                .font(.title2.bold())
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)

            if question.kind == .choice {
                ForEach(question.options, id: \.self) { option in
                    Button(option) {
                        answer(option, question: question)
                    }
                    .buttonStyle(.bordered)
                    .frame(maxWidth: .infinity)
                    .disabled(answered || disabledChoiceOptions.contains(option))
                }
            } else {
                TextField("輸入缺少的字", text: $fillAnswer)
                    .focused($fillFocused)
                    .multilineTextAlignment(.center)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .submitLabel(.done)
                    .onSubmit { answer(fillAnswer, question: question) }
                    .disabled(answered)
                    .padding()
                    .background(Color.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 12))
                    .id("quiz-fill-input")
                    .onAppear {
                        fillFocused = true
                        proxy.scrollTo("quiz-fill-input", anchor: .center)
                    }
                Button("送出") { answer(fillAnswer, question: question) }
                    .buttonStyle(.borderedProminent)
                    .disabled(answered || fillAnswer.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }

            if !feedback.isEmpty {
                Text(feedback)
                    .font(.body.bold())
                    .foregroundStyle(AppTheme.secondaryText)
                    .multilineTextAlignment(.center)
                    .accessibilityIdentifier("quiz-feedback")
            }

            if answered {
                Button(index + 1 == questions.count ? "完成研墨" : "下一題") {
                    index += 1
                    fillAnswer = ""
                    feedback = ""
                    answered = false
                    disabledChoiceOptions = []
                    choiceSecondChancesUsed = 0
                    if questions.indices.contains(index), questions[index].kind == .fill {
                        fillFocused = true
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.accent)
            }
        }
        .padding()
        .background(AppTheme.surface, in: RoundedRectangle(cornerRadius: 20))
    }

    private var completion: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 58))
                .foregroundStyle(AppTheme.accent)
            Text("研墨完成")
                .font(.largeTitle.bold())
            Text(earnedInk > 0 ? "本輪獲得 \(earnedInk) 墨" : "今日這些真言已研墨，熟練度仍有累積。")
                .multilineTextAlignment(.center)
                .foregroundStyle(AppTheme.secondaryText)
            Button(returnLabel) { dismiss() }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.accent)
        }
        .padding(24)
        .accessibilityIdentifier("learning-quiz-complete")
    }

    private func answer(_ value: String, question: LearningQuestion) {
        guard !answered else { return }
        let correct = value.trimmingCharacters(in: .whitespacesAndNewlines) == question.answer
        if !correct, question.kind == .choice {
            let decision = TreasurePassiveEngine().choiceSecondChanceDecision(
                given: value,
                answer: question.answer,
                options: question.options,
                usedChances: choiceSecondChancesUsed,
                extraChances: extraChoiceSecondChances,
                disabledOptions: disabledChoiceOptions
            )
            choiceSecondChancesUsed = decision.usedChances
            disabledChoiceOptions = decision.disabledOptions
            guard decision.shouldFinalize else {
                feedback = "先別急，我幫你刪去錯項；重新對照語意再答一次。"
                NativeGameFeedback.error()
                return
            }
        }
        do {
            let gained = try submit(question, correct)
            earnedInk += gained
            currentInk += gained
            if correct {
                feedback = gained > 0
                    ? "答對了，墨香入硯。＋\(gained) 墨"
                    : "答對了；今日已領過這則真言的墨水。"
                NativeGameFeedback.success()
            } else {
                feedback = "還差一點。判斷關鍵：\(question.kind == .fill ? "留意字數與句子結構。" : "重新對照語意與線索。")"
                NativeGameFeedback.error()
            }
            fillFocused = false
            fillAnswer = ""
            answered = true
        } catch {
            feedback = error.localizedDescription
            NativeGameFeedback.error()
        }
    }
}

private enum NativeGameFeedback {
    @MainActor
    static func success() {
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    @MainActor
    static func error() {
        UINotificationFeedbackGenerator().notificationOccurred(.error)
    }
}
