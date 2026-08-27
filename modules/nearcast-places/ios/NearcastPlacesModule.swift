import ExpoModulesCore
import MapKit

/**
 * NearcastPlacesModule — a thin wrapper around MKLocalSearchCompleter
 * and MKLocalSearch, exposed to JS as async functions.
 *
 *   isAvailable()             → true (module is linked)
 *   search(query, bias?)      → [{ id, primary, secondary }]
 *   resolve(id)               → { latitude, longitude, formatted } | null
 *
 * MKLocalSearchCompleter fires its delegate callback MULTIPLE TIMES
 * for one queryFragment as results refine. The first callback is
 * often 0–2 items; the useful set arrives a few hundred ms later.
 *
 * We solve this by delivering results with a short debounce after
 * the LATEST delegate update. Cancelled if a new query lands. Also
 * clamped by a hard timeout so a network-slow completer eventually
 * fires whatever it had.
 */
public final class NearcastPlacesModule: Module {
  private let coordinator = SearchCoordinator()

  public func definition() -> ModuleDefinition {
    Name("NearcastPlaces")

    // synchronous marker so JS can confirm the module is really
    // linked (not a stub) without invoking a search.
    Function("isAvailable") { () -> Bool in
      return true
    }

    AsyncFunction("search") { (query: String, biasLatitude: Double?, biasLongitude: Double?, biasSpan: Double?, promise: Promise) in
      let region: MKCoordinateRegion? = {
        guard let lat = biasLatitude, let lon = biasLongitude else { return nil }
        // Widen every span the caller sends. A tight span throttles
        // the completer — Apple's own Maps app uses a much wider
        // bias than any tap-zoom-level suggests.
        let span = max(biasSpan ?? 0.5, 3.0)
        return MKCoordinateRegion(
          center: CLLocationCoordinate2D(latitude: lat, longitude: lon),
          span: MKCoordinateSpan(latitudeDelta: span, longitudeDelta: span)
        )
      }()

      self.coordinator.search(query: query, region: region) { results in
        promise.resolve(results.map { entry in
          [
            "id": entry.id,
            "primary": entry.completion.title,
            "secondary": entry.completion.subtitle
          ] as [String: Any]
        })
      }
    }

    AsyncFunction("resolve") { (id: String, promise: Promise) in
      self.coordinator.resolve(id: id) { coord, formatted in
        guard let coord = coord else {
          promise.resolve(NSNull())
          return
        }
        promise.resolve([
          "latitude": coord.latitude,
          "longitude": coord.longitude,
          "formatted": formatted ?? ""
        ] as [String: Any])
      }
    }
  }
}

private struct CachedCompletion {
  let id: String
  let completion: MKLocalSearchCompletion
}

private final class SearchCoordinator: NSObject, MKLocalSearchCompleterDelegate {
  private let completer = MKLocalSearchCompleter()
  private var cache: [String: MKLocalSearchCompletion] = [:]
  private var callback: (([CachedCompletion]) -> Void)?
  private var callbackToken: UUID?
  private var deliverWorkItem: DispatchWorkItem?
  private var hardTimeout: DispatchWorkItem?

  // Debounce refinement updates and hard-cap total wait.
  private let refineDelayMs = 350
  private let hardTimeoutMs = 1600

  override init() {
    super.init()
    completer.resultTypes = [.address, .pointOfInterest]
    completer.delegate = self
  }

  func search(query: String, region: MKCoordinateRegion?, completion: @escaping ([CachedCompletion]) -> Void) {
    let token = UUID()
    DispatchQueue.main.async {
      // Cancel any pending deliver from the previous query.
      self.deliverWorkItem?.cancel()
      self.hardTimeout?.cancel()

      self.callback = completion
      self.callbackToken = token
      self.cache.removeAll()
      if let region = region {
        self.completer.region = region
      }
      self.completer.queryFragment = query

      // Hard cap so a completer that never converges still fires.
      let timeout = DispatchWorkItem { [weak self] in
        guard let self = self else { return }
        guard self.callbackToken == token, let cb = self.callback else { return }
        self.callback = nil
        self.callbackToken = nil
        let results = self.completer.results.map { result -> CachedCompletion in
          let id = UUID().uuidString
          self.cache[id] = result
          return CachedCompletion(id: id, completion: result)
        }
        cb(results)
      }
      self.hardTimeout = timeout
      DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(self.hardTimeoutMs), execute: timeout)
    }
  }

  func resolve(id: String, completion: @escaping (CLLocationCoordinate2D?, String?) -> Void) {
    guard let cached = cache[id] else {
      completion(nil, nil)
      return
    }
    let request = MKLocalSearch.Request(completion: cached)
    let search = MKLocalSearch(request: request)
    search.start { response, _ in
      guard let mapItem = response?.mapItems.first else {
        completion(nil, nil)
        return
      }
      let coord = mapItem.placemark.coordinate
      let formatted = mapItem.placemark.title ?? cached.title
      completion(coord, formatted)
    }
  }

  // MARK: - MKLocalSearchCompleterDelegate

  func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
    guard callback != nil else { return }

    // Debounce: reset a short deliver timer on each update. When
    // updates stop for refineDelayMs, we fire with what we have.
    let token = callbackToken
    deliverWorkItem?.cancel()
    let work = DispatchWorkItem { [weak self] in
      guard let self = self else { return }
      guard self.callbackToken == token, let cb = self.callback else { return }
      self.callback = nil
      self.callbackToken = nil
      self.hardTimeout?.cancel()
      let results = completer.results.map { result -> CachedCompletion in
        let id = UUID().uuidString
        self.cache[id] = result
        return CachedCompletion(id: id, completion: result)
      }
      cb(results)
    }
    deliverWorkItem = work
    DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(refineDelayMs), execute: work)
  }

  func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
    guard let cb = callback else { return }
    callback = nil
    callbackToken = nil
    deliverWorkItem?.cancel()
    hardTimeout?.cancel()
    cb([])
  }
}
