import React from "react";

const CategoryMenu = () => {
  return (
    <div className="relative  h-fit mt-2">
      <input
        type="checkbox"
        name="categoryMenuToggle"
        className="z-10 peer h-8 absolute w-full opacity-0"
      />

      <div
        className="
      flex 
      cursor-pointer 
      items-center 
      font-bold 
      justify-center
       text-cyan-50 relative w-30 
       text-center bg-cyan-700 h-8 
       overflow-hidden rounded-md 
       peer-checked:bg-cyan-800
       "
      >
        <p>Cars</p>
      </div>
      <div
        className="
      h-10 w-full 
      shadow-md 
      peer-checked:h-0 
      overflow-hidden 
      transition-all
      duration-500
      "
      >
        content
      </div>
    </div>
  );
};

export default CategoryMenu;
