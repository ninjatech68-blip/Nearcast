import ExpoModulesCore
import MapKit

/**
 * NearcastPlacesModule — a thin wrapper around MKLocalSearchCompleter
 * and MKLocalSearch, exposed to JS as async functions.
 *
 * search(query, region?)   → [{ id, primary, secondary }]
 * resolve(id)              → { latitude, longitude, formatted } | null
 *
 * Search completions are transient (MKLocalSearchCompleter reuses
 * MKLocalSearchCompletion objects), so we cache each result under a
 * generated id and resolve it later against MKLocalSearch. IDs are
 * scoped to a search session; a fresh call to search() drops the old
 * cache.
 */
public final class NearcastPlacesModule: Module {
  private let coordinator = SearchCoordinator()

  public func definition() -> ModuleDefinition {
    Name("NearcastPlaces")

    AsyncFunction("search") { (query: String, biasLatitude: Double?, biasLongitude: Double?, biasSpan: Double?, promise: Promise) in
      let region: MKCoordinateRegion? = {
        guard let lat = biasLatitude, let lon = biasLongitude else { return nil }
        let span = biasSpan ?? 0.5
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

/**
 * MKLocalSearchCompleter uses a delegate callback. We serialize
 * queries on the main queue and hold the latest completion callback
 * so we don't reply to a stale search after a fresh query landed.
 */
private final class SearchCoordinator: NSObject, MKLocalSearchCompleterDelegate {
  private let completer = MKLocalSearchCompleter()
  private var cache: [String: MKLocalSearchCompletion] = [:]
  private var currentToken: UUID?
  private var callback: (([CachedCompletion]) -> Void)?

  override init() {
    super.init()
    if #available(iOS 15.0, *) {
      completer.resultTypes = [.address, .pointOfInterest]
    }
    completer.delegate = self
  }

  func search(query: String, region: MKCoordinateRegion?, completion: @escaping ([CachedCompletion]) -> Void) {
    let token = UUID()
    DispatchQueue.main.async {
      self.currentToken = token
      self.callback = completion
      self.cache.removeAll()
      if let region = region {
        self.completer.region = region
      }
      self.completer.queryFragment = query
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
    let results = completer.results.map { result -> CachedCompletion in
      let id = UUID().uuidString
      self.cache[id] = result
      return CachedCompletion(id: id, completion: result)
    }
    self.callback?(results)
    self.callback = nil
  }

  func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
    self.callback?([])
    self.callback = nil
  }
}
