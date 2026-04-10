// Navif=gation: /search-results

import Image from "next/image";
import React from "react";

const page = () => {
  return (
    <div className="bg-background-dark text-slate-100 selection:bg-primary/30">
      <div className="relative flex h-auto min-h-screen w-full flex-col"></div>
      <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-background-dark/80 backdrop-blur-md px-4 lg:px-10 py-3">
        <div className="max-w-360 mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-3xl font-bold">
                shopping_bag
              </span>
              <h2 className="text-white text-xl font-bold leading-tight tracking-tight">
                Marketplace
              </h2>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a
                className="text-slate-400 hover:text-primary text-sm font-medium transition-colors"
                href="#"
              >
                Home
              </a>
              <a
                className="text-slate-400 hover:text-primary text-sm font-medium transition-colors"
                href="#"
              >
                Categories
              </a>
              <a
                className="text-slate-400 hover:text-primary text-sm font-medium transition-colors"
                href="#"
              >
                Deals
              </a>
            </div>
          </div>
          <div className="flex-1 max-w-xl mx-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                className="block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg leading-5 bg-slate-900/50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all"
                placeholder="Search across all categories..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors">
              <span className="material-symbols-outlined">favorite</span>
            </button>
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <span className="material-symbols-outlined text-primary text-lg">
                person
              </span>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-360 mx-auto w-full px-4 lg:px-10 py-6">
        {/*  Breadcrumbs & Keyword Summary */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <div>
            <nav className="flex text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">
              <a className="hover:text-primary" href="#">
                Home
              </a>
              <span className="mx-2">/</span>
              <a className="hover:text-primary" href="#">
                Listings
              </a>
              <span className="mx-2">/</span>
              <span className="text-slate-200">Modern Apartments</span>
            </nav>
            <h1 className="text-2xl font-bold text-white">
              Showing results for Luxury Apartments
              <span className="ml-2 text-base font-normal text-slate-500">
                (1,248 items found)
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500">View:</span>
            <div className="flex bg-slate-800 p-1 rounded-lg">
              <button className="p-1.5 bg-slate-700 rounded shadow-sm text-primary">
                <span className="material-symbols-outlined">grid_view</span>
              </button>
              <button className="p-1.5 text-slate-500 hover:text-slate-200">
                <span className="material-symbols-outlined">view_list</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar: Powerful Filters */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden sticky top-24">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-white">Filters</h3>
                <button className="text-xs text-primary font-semibold hover:underline">
                  Reset All
                </button>
              </div>
              <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
                {/* Listing Mode */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">
                    Listing Mode
                  </label>
                  <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg">
                    <button className="flex-1 py-1.5 px-3 text-sm font-medium rounded-md bg-primary text-white shadow-sm">
                      For Sale
                    </button>
                    <button className="flex-1 py-1.5 px-3 text-sm font-medium rounded-md text-slate-400 hover:text-slate-200">
                      For Rent
                    </button>
                  </div>
                </div>
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">
                    Price Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="w-full text-sm bg-slate-800 border-slate-700 rounded-lg focus:ring-primary focus:border-primary text-white"
                      placeholder="Min"
                      type="number"
                    />
                    <input
                      className="w-full text-sm bg-slate-800 border-slate-700 rounded-lg focus:ring-primary focus:border-primary text-white"
                      placeholder="Max"
                      type="number"
                    />
                  </div>
                </div>
                {/* Category */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">
                    Category
                  </label>
                  <select className="w-full text-sm bg-slate-800 border-slate-700 rounded-lg focus:ring-primary focus:border-primary text-white">
                    <option>All Categories</option>
                    <option>Real Estate</option>
                    <option>Vehicles</option>
                    <option>Electronics</option>
                    <option>Home &amp; Garden</option>
                  </select>
                </div>
                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Location
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-sm">
                      location_on
                    </span>
                    <input
                      className="w-full pl-9 text-sm bg-slate-800 border-slate-700 rounded-lg focus:ring-primary focus:border-primary text-white"
                      placeholder="City or ZIP"
                      type="text"
                    />
                  </div>
                </div>
                {/* Item Specific: Bedrooms */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">
                    Bedrooms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button className="size-9 text-xs font-bold border border-slate-700 rounded-lg hover:border-primary text-slate-400 transition-colors">
                      1+
                    </button>
                    <button className="size-9 text-xs font-bold bg-primary/20 border border-primary text-primary rounded-lg">
                      2+
                    </button>
                    <button className="size-9 text-xs font-bold border border-slate-700 rounded-lg hover:border-primary text-slate-400 transition-colors">
                      3+
                    </button>
                    <button className="size-9 text-xs font-bold border border-slate-700 rounded-lg hover:border-primary text-slate-400 transition-colors">
                      4+
                    </button>
                    <button className="size-9 text-xs font-bold border border-slate-700 rounded-lg hover:border-primary text-slate-400 transition-colors">
                      5+
                    </button>
                  </div>
                </div>
                {/* Features (Checkboxes) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">
                    Amenities
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        className="rounded text-primary focus:ring-primary border-slate-700 bg-slate-800"
                        type="checkbox"
                      />
                      <span className="text-sm text-slate-400 group-hover:text-white transition-colors">
                        Parking included
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        className="rounded text-primary focus:ring-primary border-slate-700 bg-slate-800"
                        type="checkbox"
                      />
                      <span className="text-sm text-slate-400 group-hover:text-white transition-colors">
                        Pet friendly
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        className="rounded text-primary focus:ring-primary border-slate-700 bg-slate-800"
                        type="checkbox"
                      />
                      <span className="text-sm text-slate-400 group-hover:text-white transition-colors">
                        Furnished
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-800/50">
                <button className="w-full py-2.5 bg-primary text-white font-bold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                  Apply 1,248 Results
                </button>
              </div>
            </div>
          </aside>
          {/* Listing Results Content */}
          <div className="flex-1">
            {/* Sorting & Quick Filters */}
            <div className="flex flex-wrap items-center justify-between mb-6 bg-slate-900 p-3 rounded-xl border border-slate-800">
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                <button className="whitespace-nowrap px-3 py-1.5 bg-primary/20 text-primary text-sm font-semibold rounded-full flex items-center gap-1 border border-primary/20">
                  Newest First{" "}
                  <span className="material-symbols-outlined text-sm">
                    close
                  </span>
                </button>
                <button className="whitespace-nowrap px-3 py-1.5 bg-slate-800 text-slate-400 text-sm font-medium rounded-full hover:bg-slate-700 hover:text-slate-200 transition-colors">
                  Price: Low-High
                </button>
                <button className="whitespace-nowrap px-3 py-1.5 bg-slate-800 text-slate-400 text-sm font-medium rounded-full hover:bg-slate-700 hover:text-slate-200 transition-colors">
                  Verified Sellers
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500 font-medium">
                  Sort by:
                </span>
                <select className="text-sm py-1 pl-3 pr-8 border-none bg-transparent focus:ring-0 text-white font-semibold cursor-pointer">
                  <option className="bg-slate-900">Relevance</option>
                  <option className="bg-slate-900">Newest</option>
                  <option className="bg-slate-900">Price: Low to High</option>
                  <option className="bg-slate-900">Price: High to Low</option>
                </select>
              </div>
            </div>
            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Featured Listing Card */}
              <div className="group relative bg-slate-900 border border-primary/30 rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all">
                <div className="absolute top-3 left-3 z-10 flex gap-2">
                  <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shadow-sm">
                    Featured
                  </span>
                  <span className="bg-yellow-500 text-slate-900 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider shadow-sm">
                    Verified
                  </span>
                </div>
                <button className="absolute top-3 right-3 z-10 size-8 bg-slate-800/90 backdrop-blur rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm transition-colors">
                  <span className="material-symbols-outlined">favorite</span>
                </button>
                <div className="aspect-4/3 bg-slate-800 overflow-hidden">
                  <Image
                    alt="Modern luxury apartment with balcony"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    data-alt="Modern luxury penthouse with floor to ceiling windows"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqM6Jz3K13r2_w0CwItspc821dhVILzbcimQ7eB4I3Du1OA1mV4qpJ28iG-DlzSHmFZBUjsBKxoLe-9jgxzGWpiX4S6-NMR9cx8U-ioAX6aT5uxqnbHV7i0Put7sq4GBYbFcGFZnWaz-KOfMUOcCp8u4O1Xg2o4xuIVTrzVvGqIUx7QEgahPuEEp9zx0P7Aq76_wekhJ5OurBIhHgCAYtln-2FegFW1RlYwna6OuUxTuIqt-pT3Nhkq4KzMuUUumuz3E9Fy3HDIuA"
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white group-hover:text-primary transition-colors line-clamp-1">
                      Grand Plaza Residences
                    </h4>
                    <span className="text-primary font-bold whitespace-nowrap">
                      $450,000
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 text-xs mb-4">
                    <span className="material-symbols-outlined text-sm">
                      location_on
                    </span>
                    <span className="truncate">
                      Manhattan, NY • 2 miles away
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Beds
                      </span>
                      <span className="text-sm font-semibold text-white">
                        3
                      </span>
                    </div>
                    <div className="flex flex-col items-center border-x border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Baths
                      </span>
                      <span className="text-sm font-semibold text-white">
                        2.5
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Sq Ft
                      </span>
                      <span className="text-sm font-semibold text-white">
                        1,850
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Promoted Card 2 */}
              <div className="group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:border-slate-700 transition-all">
                <div className="absolute top-3 left-3 z-10">
                  <span className="bg-slate-800/80 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                    Promoted
                  </span>
                </div>
                <button className="absolute top-3 right-3 z-10 size-8 bg-slate-800/90 backdrop-blur rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm transition-colors">
                  <span className="material-symbols-outlined">favorite</span>
                </button>
                <div className="aspect-4/3 bg-slate-800 overflow-hidden">
                  <Image
                    alt="Cozy studio apartment"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    data-alt="Cozy minimalist studio apartment interior"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCarGDjCbxXEx8m7Jm9O0LpAKOalf9hXVRNn4DOFkAr_Z5hISzzOoQfincE_7U17D0otgLOuF7RfgoUyr3FdMfLuDYiWsgcB0oNksfJTNafbvgGCYDkiG-rlOYzxbQPyOeRzA5Sc_hJQPtnyfeSfkwpFZ1rTkhPBEzPXNF2TGLj5YGyviTP3Tr2-bldez0IqMM7adObpTzTDypnFQwA1Y2ENfIklFXgUnyb_raGtQ46vJ2r_LGrA1-7PVnEyLvZ_3qevfB-bUr5Tr8"
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white group-hover:text-primary transition-colors line-clamp-1">
                      Urban Loft Downtown
                    </h4>
                    <span className="text-primary font-bold whitespace-nowrap">
                      $2,400/mo
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 text-xs mb-4">
                    <span className="material-symbols-outlined text-sm">
                      location_on
                    </span>
                    <span className="truncate">
                      Brooklyn, NY • 0.5 miles away
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Beds
                      </span>
                      <span className="text-sm font-semibold text-white">
                        1
                      </span>
                    </div>
                    <div className="flex flex-col items-center border-x border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Baths
                      </span>
                      <span className="text-sm font-semibold text-white">
                        1
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Sq Ft
                      </span>
                      <span className="text-sm font-semibold text-white">
                        750
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Regular Card 3 */}
              <div className="group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:border-slate-700 transition-all">
                <button className="absolute top-3 right-3 z-10 size-8 bg-slate-800/90 backdrop-blur rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm transition-colors">
                  <span className="material-symbols-outlined">favorite</span>
                </button>
                <div className="aspect-4/3 bg-slate-800 overflow-hidden">
                  <Image
                    alt="Suburban family house"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    data-alt="Modern suburban house with green lawn"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBldl2h8OSMEiTeN5F5pQNAQgBOZEPBvQZrwq6dZaEPxnOmCR3yXfWpvXlF_ZTGiLAPLf0Nb0HKVGCyYBg3llkisRaXhzec0ucngh8E_GGi9vzOQD0WRj9sKO8qjqZy_Q1jybNPUAbGmomVlyp-5abjadoVm4dGwNBKS0jVzjC21xl02aYmCXayN_0IFTvQmY2oYEj7nf1qEpR9-g3kbIZRz8-SHDfpUB0f8XFPE8LIeftt62w40ekBYlrRHgPvJrTDCRB3mk6yYa0"
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white group-hover:text-primary transition-colors line-clamp-1">
                      Family Home with Garden
                    </h4>
                    <span className="text-primary font-bold whitespace-nowrap">
                      $620,000
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 text-xs mb-4">
                    <span className="material-symbols-outlined text-sm">
                      location_on
                    </span>
                    <span className="truncate">Queens, NY • 5 miles away</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Beds
                      </span>
                      <span className="text-sm font-semibold text-white">
                        4
                      </span>
                    </div>
                    <div className="flex flex-col items-center border-x border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Baths
                      </span>
                      <span className="text-sm font-semibold text-white">
                        3
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Sq Ft
                      </span>
                      <span className="text-sm font-semibold text-white">
                        2,400
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Regular Card 4 */}
              <div className="group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:border-slate-700 transition-all">
                <button className="absolute top-3 right-3 z-10 size-8 bg-slate-800/90 backdrop-blur rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm transition-colors">
                  <span className="material-symbols-outlined">favorite</span>
                </button>
                <div className="aspect-4/3 bg-slate-800 overflow-hidden">
                  <Image
                    alt="Apartment bedroom"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    data-alt="Modern bedroom with city view from window"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAOsj3AhFExDqfdRhLvRqFQLQOr-j-vTeD4hWKokso235_chKG_BFlCDva4m1oZt_ELu5pwVowHiJdW3v_Xhixz_iycso4Be06RHt3L-YJIPodCn6pUfa0rlPSLB46BHPmsm7OXr_B_wTm_rhNluPpNddvei5BUEZRnoU1TWoyBd3fcT6WLKcgCiH-N4PxIhpncTzRzyf6BJTU-ow_0hV8AGzllqCxNzso00wghDxlmpQO3tM8TQMiPwD8WcxhuETY5DriOY8nLQ9A"
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white group-hover:text-primary transition-colors line-clamp-1">
                      Sunny Hillside Villa
                    </h4>
                    <span className="text-primary font-bold whitespace-nowrap">
                      $1,200,000
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 text-xs mb-4">
                    <span className="material-symbols-outlined text-sm">
                      location_on
                    </span>
                    <span className="truncate">
                      Staten Island, NY • 12 miles away
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Beds
                      </span>
                      <span className="text-sm font-semibold text-white">
                        5
                      </span>
                    </div>
                    <div className="flex flex-col items-center border-x border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Baths
                      </span>
                      <span className="text-sm font-semibold text-white">
                        4
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Sq Ft
                      </span>
                      <span className="text-sm font-semibold text-white">
                        3,800
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/*  Regular Card 5 */}
              <div className="group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:border-slate-700 transition-all">
                <button className="absolute top-3 right-3 z-10 size-8 bg-slate-800/90 backdrop-blur rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm transition-colors">
                  <span className="material-symbols-outlined">favorite</span>
                </button>
                <div className="aspect-4/3 bg-slate-800 overflow-hidden">
                  <Image
                    alt="Small studio interior"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    data-alt="Compact modern studio apartment with smart storage"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYQYqIoNRtaFBwMQvh5FSFJBrfxsAZLfHc5SSJkFfumfLD8Y6g8ZQjKeAJMQtg6Tf2bTGpBoPdm8fgJgGhUmc8zocS88jRJ7boDam8C3LRts6AMO6jpcgHkxuolncW48j1MmMm5e7vPcauQf_NcTQS6fXOH9ZOeuLS1HTl80APVA4T6q97EUwk-PnoZGWMiOWG8lmU_zEMRBK5Tw_wEUY803AooGBe11AvguyKow_Oe252NERhi5qz1wRh0-tVGMxw9i2UvPZdRrA"
                  />
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-white group-hover:text-primary transition-colors line-clamp-1">
                      Compact Studio Apartment
                    </h4>
                    <span className="text-primary font-bold whitespace-nowrap">
                      $1,850/mo
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-500 text-xs mb-4">
                    <span className="material-symbols-outlined text-sm">
                      location_on
                    </span>
                    <span className="truncate">
                      Jersey City, NJ • 3.5 miles away
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-4">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Beds
                      </span>
                      <span className="text-sm font-semibold text-white">
                        Studio
                      </span>
                    </div>
                    <div className="flex flex-col items-center border-x border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Baths
                      </span>
                      <span className="text-sm font-semibold text-white">
                        1
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold">
                        Sq Ft
                      </span>
                      <span className="text-sm font-semibold text-white">
                        450
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Promo/Ad Placeholder */}
              <div className="relative bg-linear-to-br from-primary to-blue-700 rounded-xl p-6 flex flex-col justify-between text-white overflow-hidden shadow-lg shadow-primary/30">
                <div className="absolute -right-10 -bottom-10 size-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                  <span className="inline-block px-2 py-1 bg-white/20 rounded text-[10px] font-bold uppercase mb-4 tracking-wider">
                    Marketplace Pro
                  </span>
                  <h3 className="text-xl font-bold mb-2 leading-tight">
                    Post your property today and reach 2M+ buyers!
                  </h3>
                  <p className="text-blue-100 text-sm">
                    Listings starting as low as $9.99 per month.
                  </p>
                </div>
                <button className="relative z-10 w-full py-2 bg-white text-primary font-bold rounded-lg mt-8 hover:bg-blue-50 transition-colors">
                  Get Started
                </button>
              </div>
            </div>
            {/* Pagination */}
            <div className="mt-12 flex items-center justify-between border-t border-slate-800 pt-6">
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-700 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors disabled:opacity-50">
                <span className="material-symbols-outlined">arrow_back</span>
                Previous
              </button>
              <div className="hidden sm:flex items-center gap-1">
                <button className="size-10 flex items-center justify-center rounded-lg bg-primary text-white font-bold text-sm shadow-sm">
                  1
                </button>
                <button className="size-10 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 font-medium text-sm transition-colors">
                  2
                </button>
                <button className="size-10 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 font-medium text-sm transition-colors">
                  3
                </button>
                <span className="px-2 text-slate-700">...</span>
                <button className="size-10 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 font-medium text-sm transition-colors">
                  12
                </button>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-700 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors">
                Next
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </main>
      {/* Footer Area */}
      <footer className="mt-12 bg-slate-900 border-t border-slate-800 py-10">
        <div className="max-w-360 mx-auto px-4 lg:px-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">
              shopping_bag
            </span>
            <span className="font-bold text-white">Marketplace</span>
            <span className="text-slate-500 text-sm ml-4">
              © 2024 Marketplace Inc. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-8">
            <a
              className="text-sm text-slate-500 hover:text-primary transition-colors"
              href="#"
            >
              Terms
            </a>
            <a
              className="text-sm text-slate-500 hover:text-primary transition-colors"
              href="#"
            >
              Privacy
            </a>
            <a
              className="text-sm text-slate-500 hover:text-primary transition-colors"
              href="#"
            >
              Help Center
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default page;
