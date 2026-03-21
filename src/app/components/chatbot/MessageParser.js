class MessageParser {
  constructor(actionProvider) {
    this.actionProvider = actionProvider;
  }

  parse(message) {
    // من هنا يمكنك تحليل الرسائل وتوجيهها
    if (message.includes("سيارة")) {
      this.actionProvider.handleCarAdd();
    } else if (message.includes("عقار")) {
      this.actionProvider.handlePropertyAdd();
    } else {
      this.actionProvider.handleDefault();
    }
  }
}

export default MessageParser;
