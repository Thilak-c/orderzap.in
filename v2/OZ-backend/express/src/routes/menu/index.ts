import { Router } from 'express';
import categoriesRouter from './categories';
import menuItemsRouter from './menuItems';
import menusRouter from './menus';
import itemVariantsRouter from './itemVariants';
import addOnsRouter from './addOns';
import shortcodesRouter from './shortcodes';
import zonesRouter from './zones';

/**
 * Menu Router registrar
 * ────────────────────
 * Mounts all menu-related routes with { mergeParams: true } 
 * to ensure :restaurantId is available to sub-routers.
 */
const menuRouter = Router({ mergeParams: true });

menuRouter.use('/categories', categoriesRouter);
menuRouter.use('/items', menuItemsRouter);
menuRouter.use('/menus', menusRouter);
menuRouter.use('/variants', itemVariantsRouter);
menuRouter.use('/add-ons', addOnsRouter);
menuRouter.use('/shortcodes', shortcodesRouter);
menuRouter.use('/zones', zonesRouter);

export default menuRouter;
