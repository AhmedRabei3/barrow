import React, { useState, FC, ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

const Tabs: FC<TabsProps> = ({ tabs, defaultTab }) => {
  const [activeTab, setActiveTab] = useState(
    defaultTab || (tabs.length > 0 ? tabs[0].id : "")
  );

  const activeTabContent = tabs.find((tab) => tab.id === activeTab);

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-medium transition-all ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.icon && <span className="text-lg">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white py-6">{activeTabContent?.content}</div>
    </div>
  );
};

export default Tabs;
