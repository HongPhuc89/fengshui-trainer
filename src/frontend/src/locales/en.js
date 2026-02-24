export default {
    nav: {
        home: 'Home',
        books: 'Library',
        store: 'Wallet',
        community: 'Community',
        profile: 'Profile',
    },

    header: {
        subtitle: 'ANCIENT WISDOM',
        menuAriaLabel: 'Menu',
        notificationsAriaLabel: 'Notifications',
    },

    auth: {
        login: {
            heading: 'Access the Archives',
            usernamePlaceholder: 'Enter your email address',
            usernameLabel: 'Email Address',
            passwordLabel: 'Password',
            passwordPlaceholder: 'Enter your secure key',
            forgotPassword: 'Forgot Password?',
            submitButton: 'Enter Library',
            noAccount: 'New Scholar?',
            registerLink: 'Register for Access',
            errorEmpty: 'Please enter email and password.',
            errorInvalid: 'Invalid email or password.',
            errorDeviceLocked: 'This account is locked to another device.',
        },
        register: {
            subtitle: 'SCHOLAR REGISTRATION',
            fullNameLabel: 'Full Name',
            fullNamePlaceholder: 'Nguyen Van A',
            phoneLabel: 'Phone Number',
            phonePlaceholder: '+84...',
            emailLabel: 'Email Address',
            emailPlaceholder: 'scholar@thienthu.vn',
            passwordLabel: 'Password',
            passwordPlaceholder: '••••••••',
            confirmPasswordLabel: 'Confirm Password',
            confirmPasswordPlaceholder: '••••••••',
            termsText: 'I agree to the',
            termsLink: 'Terms of Service',
            andText: 'and',
            privacyLink: 'Copyright Protection Policy',
            submitButton: 'Create Account',
            alreadyAccount: 'Already a scholar?',
            loginLink: 'Log In',
            encrypted: 'END-TO-END ENCRYPTED',
            validation: {
                fullNameRequired: 'Full name is required.',
                phoneRequired: 'Phone number is required.',
                emailRequired: 'Email is required.',
                emailInvalid: 'Invalid email format.',
                passwordRequired: 'Password is required.',
                passwordMin: 'Password must be at least 8 characters.',
                passwordMismatch: 'Passwords do not match.',
                termsRequired: 'You must accept the terms.',
            },
            error: 'Registration failed. Please try again.',
        },
        policy: {
            title: 'One Device Policy',
            body: 'For security, your account can only be active on one device at a time. Logging in here will disconnect other sessions.',
        },
        deviceLock: {
            title: 'New Device Detected',
            body: 'Your account is already linked to another device. Would you like to switch to this device?',
            canReset: 'You can switch devices right now.',
            cannotReset: 'You recently switched devices. The next switch can be done after {date}.',
            confirmButton: 'Switch to This Device',
            cancelButton: 'Cancel',
        },
    },

    home: {
        greeting: {
            morning: 'Good morning',
            afternoon: 'Good afternoon',
            evening: 'Good evening',
            scholar: 'Scholar',
        },
        motto: 'Stars align, the moment of learning.',
        profile: {
            role: 'Scholar',
            balanceLabel: 'LINH THẠCH BALANCE',
            progressLabel: 'Rank progress',
        },
        continueStudy: {
            title: 'Continue Learning',
            empty: 'Start learning',
            chapter: 'CHAPTER',
            playAriaLabel: 'Play',
        },
        newBooks: {
            title: 'New Books',
            viewAll: 'View All',
            empty: 'No books yet',
        },
        badge: {
            free: 'FREE',
            vip: 'VIP',
            premium: 'PREMIUM',
        },
    },

    books: {
        title: 'Book Library',
    },

    store: {
        title: 'Store',
    },

    community: {
        title: 'Community',
    },

    profile: {
        title: 'Profile',
    },

    common: {
        loading: 'Loading...',
        error: 'An error occurred. Please try again.',
        retry: 'Retry',
    },

    lang: {
        switchLabel: 'Switch language',
    },
}
