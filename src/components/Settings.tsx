import React, { useState } from "react";
import { Platform, Text, View } from "react-native";
import { Alert } from '../utils/dialogs';
import { Download, Upload } from "lucide-react-native";
import { Button, ErrorMessage, Field, S, Sheet, errorText } from "./ui";
import { exportBackup, importBackup } from "../services/backup";

import { usePOS } from "../store/usePOS";
export function Settings({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [passphrase, setPassphrase] = useState(""),
    [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const close = () => {
    if (busy) return;
    setPassphrase("");
    setConfirm("");
    setError("");
    setMessage("");
    onClose();
  };
  const backup = async (restore: boolean) => {
    if (busy) return;
    if (
      passphrase.length < 12 ||
      passphrase.length > 128 ||
      (!restore && passphrase !== confirm)
    ) {
      setError(
        "Use a 12–128 character passphrase. For export, both passphrase fields must match.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const done = restore
        ? await importBackup(usePOS.getState().account!, passphrase)
        : await exportBackup(usePOS.getState().account!, passphrase);
      if (done) {
        setMessage(
          restore
            ? "Backup restored. Your saved business data is ready."
            : Platform.OS === 'web' ? "Encrypted backup downloaded. Keep the file and passphrase somewhere safe." : "Encrypted backup saved to your chosen folder. Keep the passphrase somewhere safe.",
        );
        setPassphrase("");
        setConfirm("");
        await usePOS.getState().refresh();
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet title="Device & backup" visible={visible} onClose={close}>
      <ErrorMessage message={error} />
      {message && (
        <Text style={S.text} accessibilityRole="alert">
          {message}
        </Text>
      )}
      <Text style={S.h2}>Keep a copy of your counter</Text>
      <Text style={S.muted}>
        {Platform.OS === 'web' ? 'This browser profile has its own local database. Clearing site data or deleting the profile removes its orders and photos. It does not automatically sync with the Android app. Keep an encrypted backup.' : 'Data lives only on this Android device. Uninstalling the app or clearing its storage normally deletes the database and photos. Automatic Android cloud backup is disabled. Each phone has its own independent data.'}
      </Text>
      <Text style={S.muted}>
        Manual backups contain orders, menu, photos and audit logs, encrypted
        with your backup passphrase. They exclude login credentials. A forgotten
        backup passphrase cannot be recovered.
      </Text>
      <Field
        label="Backup passphrase"
        value={passphrase}
        onChangeText={setPassphrase}
        secureTextEntry
        maxLength={128}
        editable={!busy}
      />
      <Field
        label="Confirm passphrase (for export)"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        maxLength={128}
        editable={!busy}
      />
      <Button
        label="Export encrypted backup"
        icon={Upload}
        busy={busy}
        onPress={() => void backup(false)}
      />
      <Button
        label="Import encrypted backup"
        icon={Download}
        tone="secondary"
        disabled={busy}
        onPress={() =>
          Alert.alert(
            "Restore a backup",
            "Restore works only before editing the menu or taking orders on this device. It restores business data and appends imported audit events.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Choose backup", onPress: () => void backup(true) },
            ],
          )
        }
      />
      <Text style={S.muted}>
        Portable backup limit: 50 MB before encryption, including up to 35 MB of
        photos. Export regularly and copy the file off this device yourself.
      </Text>
      <Text style={S.muted}>
        Rositrus records Cash, Debit/Credit Card and QR payments after you confirm
        receipt. It does not contact a payment gateway.
      </Text>
    </Sheet>
  );
}
