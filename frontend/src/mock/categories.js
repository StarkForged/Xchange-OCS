export const categories = [
  {
    id: "mobiles",
    name: "Mobiles",
    fields: [
      { name: "brand", label: "Brand", type: "text" },
      { name: "ram", label: "RAM", type: "select", options: ["4GB", "6GB", "8GB", "12GB"] },
      { name: "storage", label: "Storage", type: "select", options: ["64GB", "128GB", "256GB", "512GB"] },
      { name: "battery", label: "Battery Health (%)", type: "number" }
    ]
  },

  {
    id: "cars",
    name: "Cars",
    fields: [
      { name: "brand", label: "Brand", type: "text" },
      { name: "model", label: "Model", type: "text" },
      { name: "fuelType", label: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "CNG", "Electric"] },
      { name: "kmDriven", label: "KM Driven", type: "number" },
      { name: "transmission", label: "Transmission", type: "select", options: ["Manual", "Automatic"] }
    ]
  },

  {
    id: "properties",
    name: "Properties",
    fields: [
      { name: "bhk", label: "BHK", type: "select", options: ["1", "2", "3", "4+"] },
      { name: "area", label: "Area (sq.ft)", type: "number" },
      { name: "furnishing", label: "Furnishing", type: "select", options: ["Furnished", "Semi-Furnished", "Unfurnished"] },
      { name: "bathrooms", label: "Bathrooms", type: "number" },
      { name: "parking", label: "Parking", type: "select", options: ["Yes", "No"] }
    ]
  },

  {
    id: "electronics",
    name: "Electronics",
    fields: [
      { name: "brand", label: "Brand", type: "text" },
      { name: "condition", label: "Condition", type: "select", options: ["New", "Like New", "Used"] },
      { name: "warranty", label: "Warranty", type: "select", options: ["Yes", "No"] }
    ]
  },

  {
    id: "furniture",
    name: "Furniture",
    fields: [
      { name: "type", label: "Furniture Type", type: "text" },
      { name: "material", label: "Material", type: "text" },
      { name: "condition", label: "Condition", type: "select", options: ["New", "Used"] }
    ]
  },

  {
    id: "jobs",
    name: "Jobs",
    fields: [
      { name: "jobType", label: "Job Type", type: "select", options: ["Full-time", "Part-time", "Internship"] },
      { name: "salary", label: "Salary", type: "number" },
      { name: "experience", label: "Experience (years)", type: "number" }
    ]
  },

  {
    id: "bikes",
    name: "Bikes",
    fields: [
      { name: "brand", label: "Brand", type: "text" },
      { name: "model", label: "Model", type: "text" },
      { name: "kmDriven", label: "KM Driven", type: "number" },
      { name: "fuelType", label: "Fuel Type", type: "select", options: ["Petrol", "Electric"] }
    ]
  }
]