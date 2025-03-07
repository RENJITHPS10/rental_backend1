const Vehicle = require('../models/Vehicle');
const cloudinary = require('cloudinary').v2;

exports.addVehicle = async (req, res) => {
  const { type, category, model, fuelType, seatingCapacity, price, location, registration } = req.body;

  if (!type || !category || !model || !price || !location || !registration) {
    return res.status(400).json({ msg: 'Please provide all required fields' });
  }

  if (!['car', 'bike'].includes(type)) {
    return res.status(400).json({ msg: 'Invalid vehicle type' });
  }

  try {
    const existingVehicle = await Vehicle.findOne({ registration });
    if (existingVehicle) return res.status(400).json({ msg: 'Vehicle with this registration number already exists' });

    let images = [];
    if (req.files && req.files['images']) {
      for (const file of req.files['images']) {
        const result = await cloudinary.uploader.upload(file.path);
        images.push(result.secure_url);
      }
    }

    let insuranceImage = null;
    if (req.files && req.files['insuranceImage']) {
      const result = await cloudinary.uploader.upload(req.files['insuranceImage'][0].path);
      insuranceImage = result.secure_url;
    }

    const vehicle = new Vehicle({
      owner: req.user.id,
      type,
      category,
      model,
      fuelType,
      seatingCapacity,
      price,
      location,
      registration,
      insuranceImage,
      images,
    });

    await vehicle.save();
    res.status(201).json({ msg: 'Vehicle added successfully', vehicle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getVehicles = async (req, res) => {
  try {
    const { location, priceMax, type, fuelType } = req.query;
    let query = { availability: true, isApproved: true };
    if (location) query.location = location;
    if (priceMax) query.price = { $lte: Number(priceMax) };
    if (type) query.type = type;
    if (fuelType) query.fuelType = fuelType;
    const vehicles = await Vehicle.find(query).populate('owner', 'name');
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.getOwnerVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user.id }).populate('owner', 'name');
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.updateVehicle = async (req, res) => {
  const { price, availability } = req.body;

  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ msg: 'Vehicle not found' });
    if (vehicle.owner.toString() !== req.user.id) return res.status(403).json({ msg: 'Not authorized' });

    let images = vehicle.images;
    if (req.files && req.files['images']) {
      images = [];
      for (const file of req.files['images']) {
        const result = await cloudinary.uploader.upload(file.path);
        images.push(result.secure_url);
      }
    }

    let insuranceImage = vehicle.insuranceImage;
    if (req.files && req.files['insuranceImage']) {
      const result = await cloudinary.uploader.upload(req.files['insuranceImage'][0].path);
      insuranceImage = result.secure_url;
    }

    vehicle.price = price || vehicle.price;
    vehicle.availability = availability !== undefined ? availability : vehicle.availability;
    vehicle.images = images;
    vehicle.insuranceImage = insuranceImage;

    await vehicle.save();

    res.json({ msg: 'Vehicle updated', vehicle });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ msg: 'Vehicle not found' });
    if (vehicle.owner.toString() !== req.user.id) return res.status(403).json({ msg: 'Not authorized' });

    if (vehicle.images && vehicle.images.length > 0) {
      for (const imageUrl of vehicle.images) {
        const publicId = imageUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      }
    }
    if (vehicle.insuranceImage) {
      const publicId = vehicle.insuranceImage.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    }

    await Vehicle.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Vehicle deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
};

exports.rateVehicle = async (req, res) => {
  const { rating } = req.body;

  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ msg: 'Vehicle not found' });

    vehicle.rating = (vehicle.rating + rating) / 2;
    await vehicle.save();
    res.json({ msg: 'Vehicle rated', vehicle });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
};