import SwiftUI
import UIKit

struct ZoomableBoardContainer<Content: View>: View {
    @ViewBuilder let content: Content
    @State private var scale: CGFloat = 1
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TwoFingerZoomScrollView(content: content, scale: $scale, reduceMotion: reduceMotion)
            .clipped()
            .accessibilityAction(named: "放大盤面") { scale = min(3, scale + 0.5) }
            .accessibilityAction(named: "縮小盤面") { scale = max(1, scale - 0.5) }
    }
}

private struct TwoFingerZoomScrollView<Content: View>: UIViewControllerRepresentable {
    let content: Content
    @Binding var scale: CGFloat
    let reduceMotion: Bool

    func makeCoordinator() -> Coordinator {
        Coordinator(content: content, scale: $scale)
    }

    func makeUIViewController(context: Context) -> UIViewController {
        let viewController = UIViewController()
        let scrollView = UIScrollView()
        scrollView.delegate = context.coordinator
        scrollView.minimumZoomScale = 1
        scrollView.maximumZoomScale = 3
        scrollView.bouncesZoom = true
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.showsVerticalScrollIndicator = false
        scrollView.panGestureRecognizer.minimumNumberOfTouches = 2
        scrollView.panGestureRecognizer.maximumNumberOfTouches = 2

        let hostingController = context.coordinator.hostingController
        let hostedView = hostingController.view!
        hostedView.backgroundColor = .clear
        hostedView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        viewController.addChild(hostingController)
        viewController.view.addSubview(scrollView)
        scrollView.addSubview(hostedView)
        hostingController.didMove(toParent: viewController)
        NSLayoutConstraint.activate([
            scrollView.leadingAnchor.constraint(equalTo: viewController.view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: viewController.view.trailingAnchor),
            scrollView.topAnchor.constraint(equalTo: viewController.view.topAnchor),
            scrollView.bottomAnchor.constraint(equalTo: viewController.view.bottomAnchor),
            hostedView.leadingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.leadingAnchor),
            hostedView.trailingAnchor.constraint(equalTo: scrollView.contentLayoutGuide.trailingAnchor),
            hostedView.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor),
            hostedView.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor),
            hostedView.widthAnchor.constraint(equalTo: scrollView.frameLayoutGuide.widthAnchor),
            hostedView.heightAnchor.constraint(equalTo: scrollView.frameLayoutGuide.heightAnchor),
        ])
        return viewController
    }

    func updateUIViewController(_ viewController: UIViewController, context: Context) {
        guard let scrollView = viewController.view.subviews.first(where: { $0 is UIScrollView }) as? UIScrollView else {
            return
        }
        context.coordinator.hostingController.rootView = content
        if abs(scrollView.zoomScale - scale) > 0.01 {
            scrollView.setZoomScale(scale, animated: !reduceMotion)
        }
    }

    @MainActor
    final class Coordinator: NSObject, UIScrollViewDelegate {
        let hostingController: UIHostingController<Content>
        @Binding private var scale: CGFloat

        init(content: Content, scale: Binding<CGFloat>) {
            hostingController = UIHostingController(rootView: content)
            _scale = scale
        }

        func viewForZooming(in scrollView: UIScrollView) -> UIView? {
            hostingController.view
        }

        func scrollViewDidZoom(_ scrollView: UIScrollView) {
            scale = scrollView.zoomScale
        }
    }
}
