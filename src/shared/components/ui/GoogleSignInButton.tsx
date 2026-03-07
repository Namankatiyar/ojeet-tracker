interface GoogleSignInButtonProps {
    onClick: () => void;
    disabled?: boolean;
    className?: string;
    ariaLabel?: string;
}

function GoogleLogo() {
    return (
        <svg
            className="google-signin-btn__logo"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            aria-hidden="true"
        >
            <path
                fill="#4285F4"
                d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2582h2.9086c1.7027-1.5682 2.6837-3.8741 2.6837-6.6155z"
            />
            <path
                fill="#34A853"
                d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1791l-2.9086-2.2582c-.8059.54-1.8368.8591-3.0477.8591-2.3468 0-4.3336-1.5845-5.0427-3.7118H.9505v2.3318C2.4314 15.9818 5.4818 18 9 18z"
            />
            <path
                fill="#FBBC05"
                d="M3.9577 10.7091c-.18-.54-.2823-1.1168-.2823-1.7091 0-.5923.1023-1.1691.2823-1.7091V4.9591H.9505C.3477 6.16 0 7.5268 0 9s.3477 2.84.9505 4.0409l3.0072-2.3318z"
            />
            <path
                fill="#EA4335"
                d="M9 3.5782c1.3214 0 2.5077.4541 3.4405 1.3459l2.5813-2.5814C13.4632.8918 11.4264 0 9 0 5.4818 0 2.4314 2.0182.9505 4.9591l3.0072 2.3318C4.6664 5.1627 6.6532 3.5782 9 3.5782z"
            />
        </svg>
    );
}

export function GoogleSignInButton({
    onClick,
    disabled = false,
    className = '',
    ariaLabel = 'Sign in with Google',
}: GoogleSignInButtonProps) {
    return (
        <button
            type="button"
            className={`google-signin-btn ${className}`.trim()}
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
        >
            <GoogleLogo />
            <span>Sign in with Google</span>
        </button>
    );
}
