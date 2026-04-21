import { AnimatePresence } from "framer-motion";
import React, { useCallback, useRef, useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import PublishMenue from "../header/PublishMenue";
import useClickOutside from "@/app/hooks/useOutsideClick";

const PublishBtn = () => {
  const [openPublish, setPublishOpen] = useState<boolean>(false);
  const publishRef = useRef(null!);
  useClickOutside(publishRef, () => setPublishOpen(false));
  const togglePublish = useCallback(() => setPublishOpen((prev) => !prev), []);

  return (
    <div className="relative hidden md:block" ref={publishRef}>
      <button
        onClick={togglePublish}
        className="
            rounded-md shadow-md 
            hover:shadow transition
            flex items-center justify-center 
            px-3 py-4 gap-2 bg-linear-to-r 
            from-sky-500 to-indigo-500 text-white
            font-extrabold
            text-sm ml-2 border border-slate-200
          "
      >
        Publish{" "}
        <FaChevronDown
          size={12}
          className={openPublish ? "rotate-180 transition" : "transition"}
        />
      </button>

      <AnimatePresence>
        {openPublish && <PublishMenue setPublishOpen={setPublishOpen} />}
      </AnimatePresence>
    </div>
  );
};

export default PublishBtn;
