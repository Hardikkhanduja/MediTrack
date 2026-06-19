import * as Notifications from "expo-notifications";

export async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleMedicineAlerts(medicine) {
  const expiry = new Date(medicine.expiry);
  await cancelMedicineAlerts(medicine.id);

  const ownerLabel = medicine.ownerName || "Self";

  const alerts = [
    {
      days: 30,
      message: `${medicine.name} for ${ownerLabel} expires in 30 days`,
    },
    {
      days: 7,
      message: `${medicine.name} for ${ownerLabel} expires in 7 days`,
    },
    {
      days: 1,
      message: `${medicine.name} for ${ownerLabel} expires tomorrow`,
    },
  ];
  for (const alert of alerts) {
    const triggerDate = new Date(expiry);
    triggerDate.setDate(triggerDate.getDate() - alert.days);
    // Schedule all expiry alerts for 9:00 AM to be more user-friendly
    triggerDate.setHours(9, 0, 0, 0);

    if (triggerDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${medicine.id}-${alert.days}`,
        content: {
          title: "Medicine Expiry Alert",
          body: alert.message,
          sound: true,
          priority: "high",
          data: {
            medicineId: medicine.id,
            medicineName: medicine.name,
            ownerName: ownerLabel,
            type: "expiry",
          },
        },
        trigger: {
          type: "date",
          date: triggerDate,
          channelId: "meditrack-alerts",
        },
      });
    }
  }
}

export async function cancelMedicineAlerts(medicineId) {
  try {
    await Notifications.cancelScheduledNotificationAsync(`${medicineId}-30`);
    await Notifications.cancelScheduledNotificationAsync(`${medicineId}-7`);
    await Notifications.cancelScheduledNotificationAsync(`${medicineId}-1`);
  } catch (e) {
    console.log("Cancel notification error:", e);
  }
}
