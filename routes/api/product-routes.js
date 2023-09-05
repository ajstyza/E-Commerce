const router = require('express').Router();
const { Product, Category, Tag, ProductTag } = require('../../models');
const { destroy } = require('../../models/Product');

router.get('/', async (req, res) => {

  try{
    const productData = await Product.findAll({
      include: [{ model: Category }, {model: Tag, through:{attributes:['id', 'product_id', 'tag_id']}}],
      attributes:[
        'id',
        'product_name',
        'price',
        'stock',
        'category_id'
      ]
      
    });

    res.status(200).json(productData);
  }
  catch(err){
    res.status(500).json(err)
  }
});


router.get('/:id', async (req, res) => {

  try{
    const productData = await Product.findOne({ where: { id: req.params.id },
      include:[{model: Category}, {model: Tag, through:{attributes:['id', 'product_id', 'tag_id']}}]
    });

    if(!productData){
      res.status(404).json({message: `No Product was found with that id` });
      return;
    }

    res.status(200).json(productData);
  }
  catch(err){
    res.status(500).json(err)
  }
});


router.post('/', async (req, res) => {

  const newProduct = await Product.create(req.body)

  if (req.body.tagIds.length) {
    const productTagIdArr = req.body.tagIds.map((tag_id) => {
      return {
        product_id: newProduct.id,
        tag_id,
      };
    });
    try{
      const tags = await ProductTag.bulkCreate(productTagIdArr);
    }
    catch(err){
      console.log(err);
      res.status(400).json(err);
    }
  }


  res.status(200).json(newProduct);
});


router.put('/:id', (req, res) => {

  Product.update(req.body, {
    where: {
      id: req.params.id,
    },
  })
    .then((product) => {

      return ProductTag.findAll({ where: { product_id: req.params.id } });
    })
    .then((productTags) => {

      const productTagIds = productTags.map(({ tag_id }) => tag_id);

      const newProductTags = req.body.tagIds
        .filter((tag_id) => !productTagIds.includes(tag_id))
        .map((tag_id) => {
          return {
            product_id: req.params.id,
            tag_id,
          };
        });
  
      const productTagsToRemove = productTags
        .filter(({ tag_id }) => !req.body.tagIds.includes(tag_id))
        .map(({ id }) => id);


      return Promise.all([
        ProductTag.destroy({ where: { id: productTagsToRemove } }),
        ProductTag.bulkCreate(newProductTags),
      ]);
    })
    .then((updatedProductTags) => res.json(updatedProductTags))
    .catch((err) => {

      res.status(400).json(err);
    });
});

router.delete('/:id', async(req, res) => {
  try {
    const productData = await Product.destroy({
      where: {
        id: req.params.id,
      },
    });

    if (!productData) {
      res.status(404).json({ message: 'No product found with that id!' });
      return;
    }

    try{
      const productTags = await ProductTag.destroy({
        where:{
          product_id: req.params.id,
        },
      })
      if(!productTags){
        console.log(`The product had no tags attached to the product`)
      }
    }catch (err) {
      res.status(500).json(err);
    }

    res.status(200).json(productData);
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;