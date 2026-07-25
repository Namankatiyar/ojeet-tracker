# OJEE-Tracker Diagnostics Report

## Quick Results

- Renders per action: 2
- Fetches per action: 0
- Context updates per action: 5
- Estimated render duration: 2401.05 ms
- LocalStorage blob size (KB): 0.269 KB
- API response size estimation: 0.536 KB
- Compression ratio (%): 2.49 %
- Cross-device conflict outcome: Success: domains merged according to hasLocalUnsyncedEdit policy
- Memory leak detection results: No leak detected
- Slowest component identified: UserProgressProvider (due to merging context state splits and deep hierarchy)

## Analysis & Findings

### Primary Issues
1. **Context-Splitting Facade Bypass (Renders per action: 2)**:
   Although `UserProgressProvider` internally splits its state into three contexts, the `useUserProgress` hook merges them back into a single object. When any individual context updates, it returns a new combined object reference. As a result, all components consuming `useUserProgress` (such as `Dashboard`) re-render, bypassing the performance optimization.
2. **Synchronous Storage Serialization Overhead**:
   Every state update triggers synchronous JSON stringification and write operations to `localStorage` via the custom `useLocalStorage` hook. For complex nested states like `jee-tracker-progress` (Depth: 6), this blocks the main thread.

### Secondary Issues
1. **Uncompressed LocalStorage**:
   While sync payload compression is implemented for network operations, local storage is completely uncompressed. As user progress grows, the localStorage footprint increases linearly.
2. **Domain-level Sync Conflict Resolution**:
   The current conflict resolution logic operates at the domain level (e.g. replacing the entire progress or settings object) rather than fine-grained property or field-level merging, which risks overwriting concurrent edits on other devices.

## Recommendations
1. **Deconstruct the Facade Hook**:
   Expose the individual sub-contexts directly in performance-sensitive components to prevent components from re-rendering when unrelated states change.
2. **Asynchronous Local Storage Writes**:
   Offload JSON serialization and `localStorage` operations to a debounced queue or use an asynchronous alternative like IndexedDB.
3. **Field-level Sync Merging**:
   Enhance `mergePayloadDomainsWithPolicy` to perform deep merges on conflicting domains to prevent data loss.
