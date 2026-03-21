class ActionProvider {
  constructor(createChatBotMessage, setStateFunc) {
    this.createChatBotMessage = createChatBotMessage;
    this.setState = setStateFunc;
  }

  handleCarAdd = () => {
    const message = this.createChatBotMessage(
      "لإضافة سيارة جديدة، يرجى تزويدي بالمعلومات التالية: الماركة، الموديل، السنة...",
    );
    this.setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  };

  handlePropertyAdd = () => {
    const message = this.createChatBotMessage(
      "لإضافة عقار جديد، يرجى تزويدي بالتفاصيل: نوع العقار، المساحة، عدد الغرف...",
    );
    this.setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  };

  handleDefault = () => {
    const message = this.createChatBotMessage(
      "يرجى تحديد نوع العنصر الذي تريد إضافته (سيارة، عقار، منتج عام)",
    );
    this.setState((prev) => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
  };
}

export default ActionProvider;
