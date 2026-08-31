import SwiftUI

struct FullBoardView: View {
    let grid: [[String?]]
    let foundPaths: [[GridCoordinate]]
    let hintCoordinates: Set<GridCoordinate>
    let onSelection: ([GridCoordinate]) -> Void
    @State private var anchor: GridCoordinate?
    @State private var preview: [GridCoordinate] = []
    @State private var accessibilityAnchor: GridCoordinate?

    var body: some View {
        ZoomableBoardContainer {
            GeometryReader { proxy in
                let side = min(proxy.size.width, proxy.size.height)
                let cellSize = side / CGFloat(grid.count)
                ZStack(alignment: .topLeading) {
                    VStack(spacing: 0) {
                        ForEach(grid.indices, id: \.self) { row in
                            HStack(spacing: 0) {
                                ForEach(grid[row].indices, id: \.self) { column in
                                    let coordinate = GridCoordinate(row: row, column: column)
                                    Text(grid[row][column] ?? "")
                                        .font(.system(size: max(14, cellSize * 0.45), weight: .bold))
                                        .foregroundStyle(AppTheme.primaryText)
                                        .frame(width: cellSize, height: cellSize)
                                        .background(cellColor(coordinate))
                                        .overlay(Rectangle().stroke(Color.white.opacity(0.3), lineWidth: 0.5))
                                        .accessibilityLabel("第 \(row + 1) 列第 \(column + 1) 欄，\(grid[row][column] ?? "空")")
                                        .accessibilityHint(accessibilityAnchor == nil ? "點兩下設為選句起點" : "點兩下選為終點")
                                        .accessibilityAddTraits(.isButton)
                                        .accessibilityAction { accessibilitySelect(coordinate) }
                                        .accessibilityAction(named: "清除選句起點") { accessibilityAnchor = nil }
                                }
                            }
                        }
                    }
                    .frame(width: side, height: side)
                    .contentShape(Rectangle())
                    .gesture(selectionGesture(cellSize: cellSize))
                }
            }
            .aspectRatio(1, contentMode: .fit)
        }
        .accessibilityIdentifier("full-board")
    }

    private func accessibilitySelect(_ coordinate: GridCoordinate) {
        guard let start = accessibilityAnchor else {
            accessibilityAnchor = coordinate
            return
        }
        accessibilityAnchor = nil
        let selected = NativeParityRules.snappedPath(from: start, to: coordinate, size: grid.count)
        if selected.count >= 2 { onSelection(selected) }
    }

    private func selectionGesture(cellSize: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { value in
                let current = coordinate(at: value.location, cellSize: cellSize)
                if anchor == nil { anchor = current }
                if let anchor, let current {
                    preview = NativeParityRules.snappedPath(from: anchor, to: current, size: grid.count)
                }
            }
            .onEnded { _ in
                let selected = preview
                anchor = nil
                preview = []
                if selected.count >= 2 { onSelection(selected) }
            }
    }

    private func coordinate(at point: CGPoint, cellSize: CGFloat) -> GridCoordinate? {
        let row = Int(point.y / cellSize)
        let column = Int(point.x / cellSize)
        guard grid.indices.contains(row), grid[row].indices.contains(column) else { return nil }
        return GridCoordinate(row: row, column: column)
    }

    private func cellColor(_ coordinate: GridCoordinate) -> Color {
        if foundPaths.contains(where: { $0.contains(coordinate) }) { return AppTheme.accent.opacity(0.7) }
        if hintCoordinates.contains(coordinate) { return Color.cyan.opacity(0.7) }
        if preview.contains(coordinate) { return Color.orange.opacity(0.55) }
        return Color.white.opacity(0.08)
    }
}
