import Fontisto from "@expo/vector-icons/Fontisto";
import { useHeaderHeight } from "@react-navigation/elements";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChatMessage, sendChatMessage } from "../services/chatService";

const INITIAL_BOT_MESSAGE: ChatMessage = {
  id: "welcome-msg",
  sender: "bot",
  text:
    "Halo! Saya Asisten Pintar UangKu.\n\n" +
    "Tentukan sistem alokasi dan gaji bulananmu. Bisa pakai rekomendasi atau buat sendiri!\n\n" +
    "Rekomendasi populer:\n" +
    "  1. 50-30-20 (Kebutuhan 50%, Keinginan 30%, Tabungan 20%)\n" +
    "  2. 60-20-20 (Kebutuhan 60%, Keinginan 20%, Tabungan 20%)\n" +
    "  3. 70-20-10 (Kebutuhan 70%, Keinginan 20%, Tabungan 10%)\n" +
    "  4. 40-40-20 (Kebutuhan 40%, Keinginan 40%, Tabungan 20%)\n\n" +
    "Atau buat aturanmu sendiri! Contoh: \"10-40-50 gaji 5jt\"\n" +
    "Yang penting totalnya pas 100%.",
  timestamp: "Baru saja",
};

const QUICK_SUGGESTIONS = [
  "50-30-20 gaji 8 juta",
  "10-40-50 gaji 5jt",
  "Makan siang 25rb tunai",
  "Berapa jatah uang hari ini?",
];

export default function AskScreen() {
  const headerHeight = useHeaderHeight();
  const [messages, setMessages] = useState<ChatMessage[]>([
    INITIAL_BOT_MESSAGE,
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Otomatis scroll ke bawah saat keyboard muncul sehingga input bar naik rapi
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const sub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    return () => sub.remove();
  }, []);

  const sendMessageWithPrompt = async (promptText: string) => {
    const prompt = promptText.trim();
    if (!prompt || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      const result = await sendChatMessage(messages, prompt);
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: result.message,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        actionRecorded: Boolean(result.action),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        sender: "bot",
        text: `Terjadi kendala: ${err?.message || "Tidak dapat memproses pesan."}`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    sendMessageWithPrompt(inputText);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    sendMessageWithPrompt(suggestion);
  };

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.sender === "user";
    return (
      <View
        style={[
          styles.messageRow,
          isUser ? styles.messageRowUser : styles.messageRowBot,
        ]}
      >
        {!isUser && (
          <View style={styles.botAvatar}>
            <Fontisto name="commenting" size={14} color="#6400de" />
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.bubbleUser : styles.bubbleBot,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.textUser : styles.textBot,
            ]}
          >
            {item.text}
          </Text>

          {item.actionRecorded && (
            <View style={styles.actionBadge}>
              <Fontisto name="check" size={10} color="#16a34a" />
              <Text style={styles.actionBadgeText}>
                Otomatis dicatat ke Dashboard UangKu
              </Text>
            </View>
          )}

          <Text
            style={[
              styles.timestampText,
              isUser ? styles.timestampUser : styles.timestampBot,
            ]}
          >
            {item.timestamp}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.chatListContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListFooterComponent={
            isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#6400de" />
                <Text style={styles.loadingText}>
                  Asisten sedang mengetik...
                </Text>
              </View>
            ) : undefined
          }
        />

        {/* Quick Suggestion Pills */}
        <View style={styles.suggestionsWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.suggestionsScrollContent}
          >
            {QUICK_SUGGESTIONS.map((suggestion, index) => (
              <TouchableOpacity
                key={`sug-${index}`}
                style={styles.suggestionPill}
                activeOpacity={0.7}
                onPress={() => handleSelectSuggestion(suggestion)}
                disabled={isLoading}
              >
                <Fontisto name="flash" size={10} color="#6400de" />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Ketik pesan..."
            placeholderTextColor="#9ca3af"
            value={inputText}
            onChangeText={setInputText}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity
            style={styles.sendButton}
            activeOpacity={0.8}
            onPress={handleSendMessage}
            disabled={isLoading || inputText.trim().length === 0}
          >
            <Fontisto
              name="paper-plane"
              size={18}
              color={inputText.trim().length > 0 ? "#000000" : "#9ca3af"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDEDED",
  },
  flexOne: {
    flex: 1,
  },
  chatListContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: 6,
    alignItems: "flex-end",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  messageRowBot: {
    justifyContent: "flex-start",
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleUser: {
    backgroundColor: "#6400de",
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: "#ffffff",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  textUser: {
    color: "#ffffff",
  },
  textBot: {
    color: "#1f2937",
  },
  actionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
    gap: 6,
    alignSelf: "flex-start",
  },
  actionBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16a34a",
  },
  timestampText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timestampUser: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  timestampBot: {
    color: "#9ca3af",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 6,
    marginBottom: 10,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: "#6b7280",
  },
  suggestionsWrapper: {
    paddingVertical: 6,
    backgroundColor: "transparent",
  },
  suggestionsScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
    backgroundColor: "transparent",
    gap: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    height: 52,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
});
