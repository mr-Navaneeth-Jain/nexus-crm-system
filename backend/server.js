
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Customer = require("./models/Customer");
const Lead = require("./models/Lead");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;



app.use(cors());
app.use(express.json());



app.get("/", (req, res) => {
  res.json({
    message: "Enterprise CRM API is running successfully!",
  });
});



app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    database:
      mongoose.connection.readyState === 1
        ? "Connected"
        : "Disconnected",
  });
});


app.get("/api/customers", async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.get("/api/customers/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.post("/api/customers", async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: error.message });
  }
});

app.put("/api/customers/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/customers/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.get("/api/leads", async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/leads/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/leads/:id/convert", async (req, res) => {
  let convertedLead = null;
  let createdCustomer = null;

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (lead.status === "Converted") {
      return res.status(409).json({
        message: "This lead has already been converted",
      });
    }

    if (lead.status !== "Qualified") {
      return res.status(400).json({
        message: "Only qualified leads can be converted",
      });
    }

    const existingCustomer = await Customer.findOne({
      email: lead.email.toLowerCase(),
    });

    if (existingCustomer) {
      return res.status(409).json({
        message:
          "A customer with this email already exists. Update the lead email or manage the existing customer.",
      });
    }

    convertedLead = await Lead.findOneAndUpdate(
      { _id: id, status: "Qualified" },
      { $set: { status: "Converted" } },
      { new: true, runValidators: true }
    );

    if (!convertedLead) {
      return res.status(409).json({
        message: "The lead status changed. Refresh and try again.",
      });
    }

    try {
      createdCustomer = await Customer.create({
        name: lead.name,
        email: lead.email,
        phone: lead.phone || "",
        company: lead.company,
        status: "Active",
      });
    } catch (error) {

        await Lead.updateOne(
        { _id: id, status: "Converted" },
        { $set: { status: "Qualified" } }
      );

      convertedLead = null;

      if (error.code === 11000) {
        return res.status(409).json({
          message: "A customer with this email already exists",
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({ message: error.message });
      }

      throw error;
    }

    return res.status(201).json({
      message: "Lead converted into a customer successfully",
      lead: convertedLead,
      customer: createdCustomer,
    });
  } catch (error) {
    console.error("Lead conversion failed:", error.message);

    if (convertedLead && !createdCustomer) {
      await Lead.updateOne(
        { _id: convertedLead._id, status: "Converted" },
        { $set: { status: "Qualified" } }
      ).catch((rollbackError) => {
        console.error("Lead rollback failed:", rollbackError.message);
      });
    }

    return res.status(500).json({
      message: "Could not convert lead. Please try again.",
    });
  }
});

app.post("/api/leads", async (req, res) => {
  try {
    const lead = await Lead.create(req.body);
    res.status(201).json(lead);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: error.message });
  }
});

app.put("/api/leads/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json(lead);
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/leads/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }

    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json({ message: "Lead deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from the .env file");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`CRM server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
