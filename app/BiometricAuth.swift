import LocalAuthentication

/// Face ID / Touch ID 인증. 결과는 웹 콜백에 그대로 넘길 수 있는 딕셔너리로 돌려줌
enum BiometricAuth {

    /// { available: Bool, type: "faceID" | "touchID" | "none" }
    static func availability() -> [String: Any] {
        let context = LAContext()
        var error: NSError?
        let available = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        let type: String
        switch context.biometryType {
        case .faceID: type = "faceID"
        case .touchID: type = "touchID"
        default: type = "none"
        }
        return ["available": available, "type": type]
    }

    /// { success: Bool, error: String | null }  — 결과는 메인 스레드에서 전달
    static func authenticate(reason: String?, completion: @escaping ([String: Any]) -> Void) {
        let context = LAContext()
        context.localizedCancelTitle = "취소"
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            completion(result(success: false, error: error))
            return
        }
        let text = (reason?.isEmpty == false) ? reason! : "본인 확인을 위해 인증해 주세요."
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: text) { success, error in
            let value = result(success: success, error: error)
            DispatchQueue.main.async { completion(value) }
        }
    }

    private static func result(success: Bool, error: Error?) -> [String: Any] {
        ["success": success, "error": success ? NSNull() : code(for: error)]
    }

    /// 웹에서 분기하기 쉬운 오류 코드
    private static func code(for error: Error?) -> String {
        guard let error = error as? LAError else { return "failed" }
        switch error.code {
        case .userCancel: return "userCancel"
        case .userFallback: return "userFallback"
        case .systemCancel, .appCancel: return "systemCancel"
        case .biometryNotAvailable: return "notAvailable"
        case .biometryNotEnrolled: return "notEnrolled"
        case .biometryLockout: return "lockout"
        case .passcodeNotSet: return "passcodeNotSet"
        case .authenticationFailed: return "failed"
        default: return "unknown"
        }
    }
}
