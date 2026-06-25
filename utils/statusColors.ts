export type StatusColors = "valid" | "expired" | "revoked";

/**
 * Returns color scheme for a given credential status
 * Provides consistent theming across the app for status indicators
 */
export const getStatusColor = (status: StatusColors) => {
  switch (status) {
    case "valid":
      return {
        label: "Valid",
        text: "#206030", 
        background: "#ECFCE5",
      };
    case "expired":
      return {
        label: "Expired",
        text: "#FFA500",
        background: "#FFF3E5",
      };
    case "revoked":
      return {
        label: "Revoked",
        text: "#D3180C",
        background: "#FFE5E5",
      };
  }
};
