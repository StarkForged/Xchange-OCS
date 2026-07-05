export const categories = [
  {
    id: "mobiles",
    name: "Mobiles",
    fields: [
      { name: "brand", label: "Brand", type: "text", required: true },
      { name: "ram", label: "RAM", type: "select", options: ["4GB", "6GB", "8GB", "12GB"], required: true },
      { name: "storage", label: "Storage", type: "select", options: ["64GB", "128GB", "256GB", "512GB"], required: true },
      { name: "battery", label: "Battery Health (%)", type: "number", required: false }
    ]
  },

  {
    id: "cars",
    name: "Cars",
    fields: [
      { name: "brand", label: "Brand", type: "text", required: true },
      { name: "model", label: "Model", type: "text", required: true },
      { name: "fuelType", label: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "CNG", "Electric"], required: true },
      { name: "kmDriven", label: "KM Driven", type: "number", required: false },
      { name: "transmission", label: "Transmission", type: "select", options: ["Manual", "Automatic"], required: false }
    ]
  },

  {
    id: "properties",
    name: "Properties",
    fields: [
      { name: "brand", label: "Brand", type: "text", required: true },
      { name: "bhk", label: "BHK", type: "select", options: ["1", "2", "3", "4+"], required: true },
      { name: "area", label: "Area (sq.ft)", type: "number", required: true },
      { name: "furnishing", label: "Furnishing", type: "select", options: ["Furnished", "Semi-Furnished", "Unfurnished"], required: false },
      { name: "bathrooms", label: "Bathrooms", type: "number", required: false },
      { name: "parking", label: "Parking", type: "select", options: ["Yes", "No"], required: false }
    ]
  },

  {
    id: "electronics",
    name: "Electronics",
    fields: [
      { name: "brand", label: "Brand", type: "text", required: true },
      { name: "condition", label: "Condition", type: "select", options: ["New", "Like New", "Used"], required: true },
      { name: "warranty", label: "Warranty", type: "select", options: ["Yes", "No"], required: false }
    ]
  },

  {
    id: "furniture",
    name: "Furniture",
    fields: [
      { name: "brand", label: "Brand", type: "text", required: true },
      { name: "type", label: "Furniture Type", type: "text", required: true },
      { name: "material", label: "Material", type: "text", required: false },
      { name: "condition", label: "Condition", type: "select", options: ["New", "Used"], required: false }
    ]
  },

  {
    id: "jobs",
    name: "Jobs",
    fields: [
      { name: "brand", label: "Brand / Company", type: "text", required: true },
      { name: "jobType", label: "Job Type", type: "select", options: ["Full-time", "Part-time", "Internship"], required: true },
      { name: "salary", label: "Salary", type: "number", required: false },
      { name: "experience", label: "Experience (years)", type: "number", required: false }
    ]
  },

  {
    id: "bikes",
    name: "Bikes",
    fields: [
      { name: "brand", label: "Brand", type: "text", required: true },
      { name: "model", label: "Model", type: "text", required: true },
      { name: "kmDriven", label: "KM Driven", type: "number", required: false },
      { name: "fuelType", label: "Fuel Type", type: "select", options: ["Petrol", "Electric"], required: true }
    ]
  }
]
