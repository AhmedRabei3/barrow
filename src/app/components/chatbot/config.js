import { createChatBotMessage } from "react-chatbot-kit";

const config = {
  botName: "أمين",
  initialMessages: [
    createChatBotMessage(
      "مرحباُ ... ، أنا أمين  أتشرف بخدمتك هل تبحث عن شيء معين ؟ أم ترغب بالاشتراك في موقعنا كي تكسب الكثير من الميزات الرائعة ؟ ",
    ),
  ],
  customStyles: {
    botMessageBox: {
      backgroundColor: "#059669",
    },
    chatButton: {
      backgroundColor: "#059669",
    },
  },
};

export default config;
