export const BFG_MEMBERSHIP_CORRELATION_KEY = "bfg-membership-correlation-id";

export const bfgClerkAppearance = {
  variables: {
    colorPrimary: "#1c563f",
    colorText: "#1a3027",
    colorTextSecondary: "#627168",
    colorBackground: "#fffdf9",
    colorInputBackground: "#fffdf9",
    colorInputText: "#1a3027",
    colorDanger: "#b14b3f",
    borderRadius: "12px",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontFamilyButtons: "Arial, Helvetica, sans-serif",
  },
  elements: {
    rootBox: "bfg-clerk-root",
    cardBox: "bfg-clerk-card-box",
    card: "bfg-clerk-card",
    headerTitle: "bfg-clerk-title",
    headerSubtitle: "bfg-clerk-subtitle",
    socialButtonsBlockButton: "bfg-clerk-social-button",
    formFieldLabel: "bfg-clerk-label",
    formFieldInput: "bfg-clerk-input",
    formFieldAction: "bfg-clerk-link",
    formButtonPrimary: "bfg-clerk-primary",
    dividerLine: "bfg-clerk-divider-line",
    dividerText: "bfg-clerk-divider-text",
    footerAction: "bfg-clerk-footer-action",
    footerActionLink: "bfg-clerk-link",
    alert: "bfg-clerk-alert",
    userButtonTrigger: "bfg-user-trigger",
    userButtonPopoverCard: "bfg-user-popover",
    userButtonPopoverActionButton: "bfg-user-action",
  },
} as const;

export const bfgClerkLocalization = {
  locale: "id-ID",
  signIn: {
    start: {
      title: "Masuk ke Blessing For Good",
      subtitle: "Khusus Blessfriends yang telah menerima undangan.",
    },
  },
  formFieldLabel__emailAddress: "Email",
  formFieldLabel__emailAddress_username: "Email atau username",
  formFieldInputPlaceholder__emailAddress_username: "Email atau username",
  formFieldAction__forgotPassword: "Lupa password?",
  formButtonPrimary: "Lanjutkan",
  socialButtonsBlockButton: "Masuk dengan {{provider}}",
  dividerText: "atau",
  unstable__errors: {
    external_account_not_found:
      "Akun ini belum terdaftar sebagai Blessfriend. Ajukan permintaan bergabung terlebih dahulu.",
  },
} as const;
