export const credentialApprovalLayout = {
  screen: {
    flex: 1,
    backgroundColor: "#06080C",
  },
  content: {
    flex: 1,
  },
  actions: {
    flexDirection: "row" as const,
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "#06080C",
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    marginHorizontal: 0,
  },
  rejectButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
};
