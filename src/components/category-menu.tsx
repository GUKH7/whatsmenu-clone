"use client"

interface Category {
  id: string
  name: string
}

interface CategoryMenuProps {
  categories: Category[]
  selectedCategory: string
  onSelectCategory: (id: string) => void
}

export default function CategoryMenu({ categories, selectedCategory, onSelectCategory }: CategoryMenuProps) {
  
  const handleScroll = (id: string) => {
    onSelectCategory(id)
    const element = document.getElementById(id)
    if (element) {
      // Faz a rolagem suave até a categoria, descontando o tamanho do cabeçalho
      const y = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  return (
    <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-100">
      <div className="flex items-center gap-3 overflow-x-auto py-3 px-4 no-scrollbar">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleScroll(category.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all
              ${selectedCategory === category.id 
                ? 'bg-red-600 text-white shadow-md shadow-red-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  )
}