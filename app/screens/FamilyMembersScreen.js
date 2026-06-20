import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppModal from "../components/AppModal";

const FAMILY_MEMBERS_KEY = "meditrack_family_members";

export default function FamilyMembersScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [medicines, setMedicines] = useState([]);
  const [members, setMembers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState(null);

  const [errorModalVisible, setErrorModalVisible] = useState(false);

  const assignedMedicines = medicines.filter(
    (med) => med.ownerId === memberToDelete,
  );

  const medicineNames = assignedMedicines
    .slice(0, 3)
    .map((m) => m.name)
    .join(", ");

  const extraCount =
    assignedMedicines.length > 3 ? assignedMedicines.length - 3 : 0;

  const RELATIONSHIPS = [
    "Dad",
    "Mom",
    "Brother",
    "Sister",
    "Grandfather",
    "Grandmother",
    "Wife",
    "Child",
  ];

  const [relationship, setRelationship] = useState("");

  useEffect(() => {
    loadMembers();
    loadMedicines();
  }, []);

  async function loadMembers() {
    try {
      const stored = await AsyncStorage.getItem(FAMILY_MEMBERS_KEY);

      if (stored) {
        setMembers(JSON.parse(stored));
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function loadMedicines() {
    try {
      const stored = await AsyncStorage.getItem("medicines");

      if (stored) {
        setMedicines(JSON.parse(stored));
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function saveMembers(updatedMembers) {
    try {
      await AsyncStorage.setItem(
        FAMILY_MEMBERS_KEY,
        JSON.stringify(updatedMembers),
      );
      setMembers(updatedMembers);
    } catch (error) {
      console.log(error);
    }
  }

  async function addMember() {
    if (!name.trim() || !relationship.trim()) {
      setErrorModalVisible(true);
      return;
    }

    const newMember = {
      id: Date.now().toString(),
      name: name.trim(),
      relationship: relationship.trim(),
      createdAt: Date.now(),
    };

    const updatedMembers = [...members, newMember];

    await saveMembers(updatedMembers);

    setName("");
    setRelationship("");
    setModalVisible(false);
  }

  function deleteMember(memberId) {
    setMemberToDelete(memberId);
    setDeleteModalVisible(true);
  }

  async function confirmDeleteMember() {
    if (!memberToDelete) return;

    const updatedMembers = members.filter((item) => item.id !== memberToDelete);

    const updatedMedicines = medicines.map((medicine) => {
      if (medicine.ownerId === memberToDelete) {
        return {
          ...medicine,
          ownerId: "SELF",
          ownerName: "Self",
        };
      }

      return medicine;
    });

    await AsyncStorage.setItem("medicines", JSON.stringify(updatedMedicines));

    setMedicines(updatedMedicines);

    await saveMembers(updatedMembers);

    setDeleteModalVisible(false);
    setMemberToDelete(null);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color="#ffffff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Family Members</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>FAMILY CABINET</Text>

        {members.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={38} color="#9b8fff" />

            <Text style={styles.emptyTitle}>No Family Members Yet</Text>

            <Text style={styles.emptySubtitle}>
              Add family members to organize medicines and manage inventory
              separately.
            </Text>
          </View>
        ) : (
          members.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberLetter}>
                  {member.name[0].toUpperCase()}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{member.name}</Text>

                <Text style={styles.memberRelation}>{member.relationship}</Text>
              </View>

              <TouchableOpacity onPress={() => deleteMember(member.id)}>
                <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Family Member</Text>

            <TextInput
              placeholder="Name"
              placeholderTextColor="#555568"
              style={styles.input}
              value={name}
              onChangeText={setName}
            />

            <Text
              style={{
                color: "#666680",
                fontSize: 12,
                fontWeight: "700",
                letterSpacing: 1,
                marginBottom: 10,
              }}
            >
              RELATIONSHIP
            </Text>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 16,
              }}
            >
              {RELATIONSHIPS.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setRelationship(item)}
                  style={[
                    styles.relationshipChip,
                    relationship === item && styles.relationshipChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.relationshipChipText,
                      relationship === item &&
                        styles.relationshipChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={addMember}>
                <Text style={styles.saveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AppModal
        visible={deleteModalVisible}
        type="warning"
        title="Remove Family Member?"
        message={
          assignedMedicines.length === 0
            ? "This family member has no assigned medicines."
            : `${assignedMedicines.length} medicine${
                assignedMedicines.length > 1 ? "s are" : " is"
              } currently assigned to this member and will be automatically reassigned to Self.`
        }
        primaryText="Remove"
        secondaryText="Cancel"
        onPrimary={confirmDeleteMember}
        onSecondary={() => {
          setDeleteModalVisible(false);
          setMemberToDelete(null);
        }}
        onClose={() => {
          setDeleteModalVisible(false);
          setMemberToDelete(null);
        }}
      />

      <AppModal
        visible={errorModalVisible}
        type="error"
        title="Missing Information"
        message="Please enter both a name and relationship before adding a family member."
        primaryText="OK"
        onPrimary={() => setErrorModalVisible(false)}
        onClose={() => setErrorModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0f",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 15,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a24",
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  sectionLabel: {
    color: "#555568",
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: 12,
  },

  emptyCard: {
    backgroundColor: "#161620",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#222230",
    padding: 24,
    alignItems: "center",
  },

  emptyTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
  },

  emptySubtitle: {
    color: "#666680",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },

  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161620",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222230",
    padding: 16,
    marginBottom: 12,
  },

  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#9b8fff22",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  memberLetter: {
    color: "#9b8fff",
    fontSize: 18,
    fontWeight: "700",
  },

  memberName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  memberRelation: {
    color: "#666680",
    marginTop: 4,
  },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 25,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#9b8fff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  modalBox: {
    backgroundColor: "#161620",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#222230",
  },

  modalTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },

  input: {
    backgroundColor: "#0d0d0f",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a38",
    color: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },

  modalButtons: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: "#222230",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  saveBtn: {
    flex: 1,
    backgroundColor: "#9b8fff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  cancelText: {
    color: "#aaaacc",
    fontWeight: "700",
  },

  saveText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  relationshipChip: {
    backgroundColor: "#161620",
    borderWidth: 1,
    borderColor: "#222230",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  relationshipChipActive: {
    backgroundColor: "#9b8fff",
    borderColor: "#9b8fff",
  },

  relationshipChipText: {
    color: "#aaaacc",
    fontWeight: "600",
  },

  relationshipChipTextActive: {
    color: "#ffffff",
  },
});
