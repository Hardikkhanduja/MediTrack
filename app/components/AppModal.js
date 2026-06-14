import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AppModal({
  visible,
  type = "info",
  title,
  message,
  primaryText = "OK",
  secondaryText,
  singleButton = false,
  onPrimary,
  onSecondary,
  onClose,
}) {
  const iconMap = {
    error: {
      icon: "alert-circle-outline",
      color: "#ffb347",
    },
    danger: {
      icon: "trash-outline",
      color: "#ff6666",
    },
    success: {
      icon: "checkmark-circle-outline",
      color: "#4ade80",
    },
    info: {
      icon: "information-circle-outline",
      color: "#9b8fff",
    },
    warning: {
      icon: "warning-outline",
      color: "#fbbf24",
    },
  };

  const selected = iconMap[type] || iconMap.info;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Ionicons
            name={selected.icon}
            size={42}
            color={selected.color}
            style={styles.icon}
          />

          <Text style={styles.title}>{title}</Text>

          <Text style={styles.message}>{message}</Text>

          <View
            style={[styles.buttonRow, singleButton && styles.singleButtonRow]}
          >
            {!singleButton && secondaryText && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={onSecondary}
              >
                <Text style={styles.secondaryBtnText}>{secondaryText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                singleButton && styles.singlePrimaryBtn,
                type === "danger" && styles.dangerBtn,
              ]}
              onPress={onPrimary}
            >
              <Text style={styles.primaryBtnText}>{primaryText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  singlePrimaryBtn: {
    flex: 0,
    minWidth: 140,
  },

  singleButtonRow: {
    justifyContent: "center",
  },

  modalCard: {
    width: "100%",
    backgroundColor: "#090b12",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "#232338",
  },

  icon: {
    alignSelf: "center",
    marginBottom: 14,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 14,
  },

  message: {
    fontSize: 15,
    lineHeight: 24,
    color: "#aaaacc",
    textAlign: "center",
  },

  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 26,
  },

  secondaryBtn: {
    flex: 1,
    backgroundColor: "#3a3a42",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6666ff",
  },

  primaryBtn: {
    flex: 1,
    backgroundColor: "#9b8fff",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },

  dangerBtn: {
    backgroundColor: "#8b0000",
  },

  primaryBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },

  secondaryBtnText: {
    color: "#d0d0e0",
    fontWeight: "700",
    fontSize: 16,
  },
});
