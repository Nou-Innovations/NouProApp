/**
 * Seed Data: Products (111 products across 30 brands)
 * Helper to create a product entry with defaults
 */
const p = (id, biz, name, brand, brandId, brandLogo, pic, price, cost, cat, unit, qty, sku) => ({
  id, businessId: biz, name, brand, brandId, brandLogo, productPicture: pic,
  price, costPrice: cost, salePrice: price, category: cat, unit, status: 'active',
  stockQuantity: qty, isListed: true, isDisplayable: true, isCreatedByUser: true,
  taxRate: 15, sku, barcode: null, description: name,
});

const CL = (d) => `https://logo.clearbit.com/${d}`;
const UI = (n,bg) => `https://ui-avatars.com/api/?name=${n}&background=${bg}&size=200`;
const UN = (id) => `https://images.unsplash.com/photo-${id}?w=400`;

const products = [
  // Coca-Cola (brand-1, biz-1)
  p('prod-001','biz-1','Coca-Cola Classic 500ml','Coca-Cola','brand-1',CL('coca-cola.com'),UN('1629203851122-3726ecdf080e'),45,30,'Beverages','500ml',500,'CC-500'),
  p('prod-002','biz-1','Coca-Cola Zero 330ml Can','Coca-Cola','brand-1',CL('coca-cola.com'),UN('1624552184280-9e9631bbeee9'),35,22,'Beverages','330ml',400,'CCZ-330'),
  p('prod-003','biz-1','Coca-Cola Diet 1.5L','Coca-Cola','brand-1',CL('coca-cola.com'),UN('1567103472667-6898f3a79cf2'),75,50,'Beverages','1.5L',200,'CCD-1500'),
  p('prod-004','biz-1','Fanta Orange 1L','Coca-Cola','brand-1',CL('coca-cola.com'),UN('1624517452488-04869289c4ca'),55,35,'Beverages','1L',300,'FO-1000'),
  p('prod-005','biz-1','Sprite 500ml','Coca-Cola','brand-1',CL('coca-cola.com'),UN('1625772299848-391b6a87d7b3'),40,27,'Beverages','500ml',350,'SP-500'),

  // Pepsi (brand-2, biz-1)
  p('prod-006','biz-1','Pepsi Original 500ml','Pepsi','brand-2',CL('pepsi.com'),UN('1553456558-aff63285bdd1'),42,28,'Beverages','500ml',400,'PEP-500'),
  p('prod-007','biz-1','Pepsi Max 330ml Can','Pepsi','brand-2',CL('pepsi.com'),UN('1629203849820-fdd70d49c38e'),32,20,'Beverages','330ml',350,'PMAX-330'),
  p('prod-008','biz-1','Mountain Dew 500ml','Pepsi','brand-2',CL('pepsi.com'),UN('1622483767028-3f66f32aef97'),45,30,'Beverages','500ml',250,'MD-500'),
  p('prod-009','biz-1','7UP 1.5L','Pepsi','brand-2',CL('pepsi.com'),UN('1625772299848-391b6a87d7b3'),70,45,'Beverages','1.5L',200,'7UP-1500'),

  // Nestle (brand-3, biz-1)
  p('prod-010','biz-1','Nescafe Classic 200g','Nestle','brand-3',CL('nestle.com'),UN('1559056199-641a0ac8b55e'),185,120,'Food','200g',150,'NFC-200'),
  p('prod-011','biz-1','Maggi 2-Min Noodles x5','Nestle','brand-3',CL('nestle.com'),UN('1612929633738-8fe44f7ec841'),65,42,'Food','5-pack',300,'MAG-5PK'),
  p('prod-012','biz-1','KitKat 4-Finger','Nestle','brand-3',CL('nestle.com'),UN('1582058091505-f87a2e55a40f'),35,22,'Snacks','45g',500,'KK-4F'),
  p('prod-013','biz-1','Milo 400g','Nestle','brand-3',CL('nestle.com'),UN('1574015974293-817f0ebebb79'),145,95,'Beverages','400g',200,'MILO-400'),
  p('prod-014','biz-1','Nestle Pure Life 1.5L','Nestle','brand-3',CL('nestle.com'),UN('1548839140-29a749e1cf4d'),25,15,'Beverages','1.5L',600,'NPL-1500'),

  // Danone (brand-4, biz-1)
  p('prod-015','biz-1','Activia Yogurt Strawberry 125g','Danone','brand-4',CL('danone.com'),UN('1488477181946-6428a0291777'),55,35,'Food','125g',150,'ACT-STR'),
  p('prod-016','biz-1','Evian Natural Water 500ml','Danone','brand-4',CL('danone.com'),UN('1564419320461-6262af237a4c'),65,40,'Beverages','500ml',400,'EV-500'),
  p('prod-017','biz-1','Danone Plain Yogurt 450g','Danone','brand-4',CL('danone.com'),UN('1571212515416-fef01fc43637'),85,55,'Food','450g',120,'DAN-PLN'),
  p('prod-018','biz-1','Volvic Mineral Water 1L','Danone','brand-4',CL('danone.com'),UN('1548839140-29a749e1cf4d'),55,32,'Beverages','1L',300,'VOL-1000'),

  // Unilever (brand-5, biz-1)
  p('prod-019','biz-1','Lipton Yellow Label Tea 100s','Unilever','brand-5',CL('unilever.com'),UN('1556679343-c7306c1976bc'),125,80,'Beverages','100 bags',200,'LIP-100'),
  p('prod-020','biz-1','Knorr Chicken Stock Cubes 8s','Unilever','brand-5',CL('unilever.com'),UN('1607532941433-304659e8198a'),45,28,'Food','8 cubes',400,'KNR-8C'),
  p('prod-021','biz-1','Hellmann\'s Mayonnaise 400g','Unilever','brand-5',CL('unilever.com'),UN('1613478881426-deeadee8e48e'),95,62,'Food','400g',180,'HLM-400'),
  p('prod-022','biz-1','Sunsilk Shampoo 400ml','Unilever','brand-5',CL('unilever.com'),UN('1535585209827-a15fcdbc4c2d'),135,85,'Personal Care','400ml',150,'SS-400'),

  // Red Bull (brand-6, biz-1)
  p('prod-023','biz-1','Red Bull Energy 250ml','Red Bull','brand-6',CL('redbull.com'),UN('1613048367766-63b9f3b5db8a'),85,55,'Beverages','250ml',500,'RB-250'),
  p('prod-024','biz-1','Red Bull Sugar Free 250ml','Red Bull','brand-6',CL('redbull.com'),UN('1613048367766-63b9f3b5db8a'),85,55,'Beverages','250ml',300,'RBSF-250'),
  p('prod-025','biz-1','Red Bull Tropical 250ml','Red Bull','brand-6',CL('redbull.com'),UN('1613048367766-63b9f3b5db8a'),90,58,'Beverages','250ml',200,'RBT-250'),

  // Heineken (brand-7, biz-1)
  p('prod-026','biz-1','Heineken Lager 330ml','Heineken','brand-7',CL('heineken.com'),UN('1608270586620-248524c67de9'),75,48,'Beverages','330ml',400,'HNK-330'),
  p('prod-027','biz-1','Heineken 0.0 Non-Alcoholic 330ml','Heineken','brand-7',CL('heineken.com'),UN('1608270586620-248524c67de9'),65,40,'Beverages','330ml',200,'HNK00-330'),
  p('prod-028','biz-1','Heineken Silver 330ml','Heineken','brand-7',CL('heineken.com'),UN('1608270586620-248524c67de9'),80,52,'Beverages','330ml',250,'HNKS-330'),

  // Schweppes (brand-8, biz-1)
  p('prod-029','biz-1','Schweppes Tonic Water 1L','Schweppes','brand-8',CL('schweppes.com'),UN('1558645836-e44122a743ee'),55,35,'Beverages','1L',250,'SWT-1000'),
  p('prod-030','biz-1','Schweppes Ginger Ale 330ml','Schweppes','brand-8',CL('schweppes.com'),UN('1558645836-e44122a743ee'),35,22,'Beverages','330ml',300,'SWGA-330'),
  p('prod-031','biz-1','Schweppes Soda Water 1L','Schweppes','brand-8',CL('schweppes.com'),UN('1558645836-e44122a743ee'),45,28,'Beverages','1L',280,'SWSW-1000'),

  // P&G (brand-9, biz-1)
  p('prod-032','biz-1','Ariel Washing Powder 2kg','P&G','brand-9',CL('pg.com'),UN('1582735689369-4fe89db7114c'),275,180,'Cleaning','2kg',100,'ARL-2KG'),
  p('prod-033','biz-1','Pampers Baby Dry Size 4 x30','P&G','brand-9',CL('pg.com'),UN('1544367567-0f2fcb009e0b'),450,300,'Personal Care','30 pcs',80,'PAM-S4'),
  p('prod-034','biz-1','Gillette Blue3 Razors 6+2','P&G','brand-9',CL('pg.com'),UN('1585232004423-244e0e6904e3'),195,125,'Personal Care','8 razors',120,'GIL-B3'),
  p('prod-035','biz-1','Head & Shoulders Classic 400ml','P&G','brand-9',CL('pg.com'),UN('1535585209827-a15fcdbc4c2d'),155,100,'Personal Care','400ml',100,'HS-400'),

  // Colgate (brand-10, biz-1)
  p('prod-036','biz-1','Colgate Total 150g','Colgate','brand-10',CL('colgate.com'),UN('1609840114035-3c981b782dfe'),75,48,'Personal Care','150g',250,'CLG-150'),
  p('prod-037','biz-1','Colgate Max Fresh 100ml','Colgate','brand-10',CL('colgate.com'),UN('1609840114035-3c981b782dfe'),55,35,'Personal Care','100ml',200,'CLG-MF'),
  p('prod-038','biz-1','Colgate Toothbrush Medium','Colgate','brand-10',CL('colgate.com'),UN('1559650656-5d1d361ad10e'),35,20,'Personal Care','1pc',400,'CLG-TB'),

  // Lay's (brand-11, biz-2)
  p('prod-039','biz-2','Lay\'s Classic Salted 150g','Lay\'s','brand-11',CL('lays.com'),UN('1566478989037-eec170784d0b'),85,55,'Snacks','150g',300,'LAY-CL'),
  p('prod-040','biz-2','Lay\'s Sour Cream & Onion 150g','Lay\'s','brand-11',CL('lays.com'),UN('1566478989037-eec170784d0b'),85,55,'Snacks','150g',250,'LAY-SCO'),
  p('prod-041','biz-2','Lay\'s BBQ 100g','Lay\'s','brand-11',CL('lays.com'),UN('1566478989037-eec170784d0b'),65,42,'Snacks','100g',200,'LAY-BBQ'),
  p('prod-042','biz-2','Lay\'s Paprika 150g','Lay\'s','brand-11',CL('lays.com'),UN('1566478989037-eec170784d0b'),85,55,'Snacks','150g',180,'LAY-PAP'),

  // Doritos (brand-12, biz-2)
  p('prod-043','biz-2','Doritos Nacho Cheese 180g','Doritos','brand-12',CL('doritos.com'),UN('1600952841320-db92ec4047ca'),115,75,'Snacks','180g',200,'DRT-NC'),
  p('prod-044','biz-2','Doritos Cool Ranch 180g','Doritos','brand-12',CL('doritos.com'),UN('1600952841320-db92ec4047ca'),115,75,'Snacks','180g',180,'DRT-CR'),
  p('prod-045','biz-2','Doritos Sweet Chilli 150g','Doritos','brand-12',CL('doritos.com'),UN('1600952841320-db92ec4047ca'),105,68,'Snacks','150g',150,'DRT-SC'),

  // Pringles (brand-13, biz-2)
  p('prod-046','biz-2','Pringles Original 150g','Pringles','brand-13',CL('pringles.com'),UN('1621447504864-d8686e12698c'),135,88,'Snacks','150g',200,'PRG-OG'),
  p('prod-047','biz-2','Pringles Sour Cream 150g','Pringles','brand-13',CL('pringles.com'),UN('1621447504864-d8686e12698c'),135,88,'Snacks','150g',180,'PRG-SC'),
  p('prod-048','biz-2','Pringles Hot & Spicy 150g','Pringles','brand-13',CL('pringles.com'),UN('1621447504864-d8686e12698c'),135,88,'Snacks','150g',150,'PRG-HS'),

  // Dove (brand-14, biz-2)
  p('prod-049','biz-2','Dove Beauty Bar 100g','Dove','brand-14',CL('dove.com'),UN('1596755389378-c31d21fd1273'),65,42,'Personal Care','100g',300,'DVE-BB'),
  p('prod-050','biz-2','Dove Body Wash 500ml','Dove','brand-14',CL('dove.com'),UN('1596755389378-c31d21fd1273'),175,112,'Personal Care','500ml',150,'DVE-BW'),
  p('prod-051','biz-2','Dove Deodorant Spray 150ml','Dove','brand-14',CL('dove.com'),UN('1596755389378-c31d21fd1273'),95,60,'Personal Care','150ml',200,'DVE-DEO'),
  p('prod-052','biz-2','Dove Shampoo Intensive Repair 400ml','Dove','brand-14',CL('dove.com'),UN('1535585209827-a15fcdbc4c2d'),145,92,'Personal Care','400ml',120,'DVE-SH'),

  // Nivea (brand-15, biz-2)
  p('prod-053','biz-2','Nivea Creme 150ml','Nivea','brand-15',CL('nivea.com'),UN('1556228578-0d85b1a4d571'),125,80,'Personal Care','150ml',200,'NVA-CR'),
  p('prod-054','biz-2','Nivea Men Shower Gel 500ml','Nivea','brand-15',CL('nivea.com'),UN('1556228578-0d85b1a4d571'),155,100,'Personal Care','500ml',150,'NVA-MN'),
  p('prod-055','biz-2','Nivea Sun SPF50 200ml','Nivea','brand-15',CL('nivea.com'),UN('1556228578-0d85b1a4d571'),295,190,'Personal Care','200ml',100,'NVA-SUN'),
  p('prod-056','biz-2','Nivea Body Lotion 400ml','Nivea','brand-15',CL('nivea.com'),UN('1556228578-0d85b1a4d571'),165,105,'Personal Care','400ml',130,'NVA-BL'),

  // Samsung (brand-16, biz-4)
  p('prod-057','biz-4','Samsung Galaxy A15 128GB','Samsung','brand-16',CL('samsung.com'),UN('1610945415295-d9bbf067e59c'),8500,6500,'Electronics','1pc',25,'SAM-A15'),
  p('prod-058','biz-4','Samsung 32" LED TV','Samsung','brand-16',CL('samsung.com'),UN('1593359677879-a4bb92f829d1'),12500,9500,'Electronics','1pc',15,'SAM-TV32'),
  p('prod-059','biz-4','Samsung Galaxy Buds FE','Samsung','brand-16',CL('samsung.com'),UN('1590658268037-6bf12f032f55'),4200,3200,'Electronics','1pc',30,'SAM-BUDS'),
  p('prod-060','biz-4','Samsung 256GB microSD','Samsung','brand-16',CL('samsung.com'),UN('1618384887929-16ec33fab9ef'),1200,850,'Electronics','1pc',50,'SAM-SD256'),
  p('prod-061','biz-4','Samsung Galaxy A25 256GB','Samsung','brand-16',CL('samsung.com'),UN('1610945415295-d9bbf067e59c'),12900,9800,'Electronics','1pc',20,'SAM-A25'),

  // LG (brand-17, biz-4)
  p('prod-062','biz-4','LG 43" 4K Smart TV','LG','brand-17',CL('lg.com'),UN('1593359677879-a4bb92f829d1'),18500,14000,'Electronics','1pc',10,'LG-TV43'),
  p('prod-063','biz-4','LG Soundbar SN4 300W','LG','brand-17',CL('lg.com'),UN('1545454675-3531b543be5d'),6500,4800,'Electronics','1pc',12,'LG-SB300'),
  p('prod-064','biz-4','LG 8kg Front Loader Washer','LG','brand-17',CL('lg.com'),UN('1626806787461-102c1bfaaea1'),22000,16500,'Appliances','1pc',8,'LG-WM8'),
  p('prod-065','biz-4','LG 260L Double Door Fridge','LG','brand-17',CL('lg.com'),UN('1571175443880-49e1d25b2bc5'),25000,19000,'Appliances','1pc',6,'LG-FR260'),

  // Sony (brand-18, biz-4)
  p('prod-066','biz-4','Sony WH-1000XM5 Headphones','Sony','brand-18',CL('sony.com'),UN('1618366712010-f4ae9c647dcb'),15500,11800,'Electronics','1pc',15,'SNY-XM5'),
  p('prod-067','biz-4','Sony SRS-XB13 Bluetooth Speaker','Sony','brand-18',CL('sony.com'),UN('1608043152269-423dbba4e7e1'),2800,2100,'Electronics','1pc',25,'SNY-XB13'),
  p('prod-068','biz-4','Sony DualSense PS5 Controller','Sony','brand-18',CL('sony.com'),UN('1606144042614-b2417e99c4e3'),3200,2400,'Electronics','1pc',20,'SNY-DS'),
  p('prod-069','biz-4','Sony 55" 4K BRAVIA TV','Sony','brand-18',CL('sony.com'),UN('1593359677879-a4bb92f829d1'),35000,26500,'Electronics','1pc',5,'SNY-TV55'),

  // Philips (brand-19, biz-4)
  p('prod-070','biz-4','Philips LED Bulb 9W E27','Philips','brand-19',CL('philips.com'),UN('1532622785990-d2c36a76f5a6'),95,60,'Electronics','1pc',500,'PHL-LED9'),
  p('prod-071','biz-4','Philips Electric Shaver S3000','Philips','brand-19',CL('philips.com'),UN('1585232004423-244e0e6904e3'),3500,2600,'Personal Care','1pc',20,'PHL-SH3K'),
  p('prod-072','biz-4','Philips Air Fryer HD9252','Philips','brand-19',CL('philips.com'),UN('1626509653291-18d9a934b9db'),5800,4300,'Appliances','1pc',10,'PHL-AF'),
  p('prod-073','biz-4','Philips Sonicare Toothbrush','Philips','brand-19',CL('philips.com'),UN('1559650656-5d1d361ad10e'),2800,2100,'Personal Care','1pc',15,'PHL-SONIC'),

  // Logitech (brand-20, biz-4)
  p('prod-074','biz-4','Logitech MX Master 3S','Logitech','brand-20',CL('logitech.com'),UN('1527864550417-7fd91fc51a46'),4500,3400,'Technology','1pc',20,'LOG-MX3S'),
  p('prod-075','biz-4','Logitech K380 Bluetooth Keyboard','Logitech','brand-20',CL('logitech.com'),UN('1587829741301-dc798b83add3'),2200,1650,'Technology','1pc',25,'LOG-K380'),
  p('prod-076','biz-4','Logitech C920 HD Webcam','Logitech','brand-20',CL('logitech.com'),UN('1587826080692-f439cd0b70da'),3800,2850,'Technology','1pc',15,'LOG-C920'),
  p('prod-077','biz-4','Logitech G305 Gaming Mouse','Logitech','brand-20',CL('logitech.com'),UN('1527864550417-7fd91fc51a46'),2500,1850,'Technology','1pc',18,'LOG-G305'),

  // Anker (brand-21, biz-4)
  p('prod-078','biz-4','Anker PowerCore 10000mAh','Anker','brand-21',CL('anker.com'),UN('1609091839311-d5365f9ff1c5'),1500,1100,'Technology','1pc',40,'ANK-PC10'),
  p('prod-079','biz-4','Anker USB-C Cable 1.8m','Anker','brand-21',CL('anker.com'),UN('1583394838336-acd977736f90'),450,300,'Technology','1pc',100,'ANK-USBC'),
  p('prod-080','biz-4','Anker Soundcore Life Q30','Anker','brand-21',CL('anker.com'),UN('1618366712010-f4ae9c647dcb'),3500,2600,'Electronics','1pc',12,'ANK-Q30'),
  p('prod-081','biz-4','Anker 20W USB-C Charger','Anker','brand-21',CL('anker.com'),UN('1583394838336-acd977736f90'),850,600,'Technology','1pc',60,'ANK-20W'),

  // TP-Link (brand-22, biz-4)
  p('prod-082','biz-4','TP-Link Archer AX23 WiFi 6 Router','TP-Link','brand-22',CL('tp-link.com'),UN('1606904825846-647eb07f5be2'),3200,2400,'Technology','1pc',15,'TPL-AX23'),
  p('prod-083','biz-4','TP-Link Tapo C200 Camera','TP-Link','brand-22',CL('tp-link.com'),UN('1585771724684-38269d6639fd'),1800,1300,'Technology','1pc',20,'TPL-C200'),
  p('prod-084','biz-4','TP-Link 8-Port Gigabit Switch','TP-Link','brand-22',CL('tp-link.com'),UN('1606904825846-647eb07f5be2'),1200,880,'Technology','1pc',25,'TPL-SW8'),
  p('prod-085','biz-4','TP-Link Deco M5 Mesh WiFi 3-pack','TP-Link','brand-22',CL('tp-link.com'),UN('1606904825846-647eb07f5be2'),5500,4100,'Technology','3-pack',8,'TPL-M5'),

  // Dettol (brand-23, biz-8)
  p('prod-086','biz-8','Dettol Antiseptic Liquid 500ml','Dettol','brand-23',CL('dettol.com'),UN('1584820927498-cfe5211fd8bf'),145,95,'Cleaning','500ml',200,'DTL-500'),
  p('prod-087','biz-8','Dettol Handwash Original 250ml','Dettol','brand-23',CL('dettol.com'),UN('1584820927498-cfe5211fd8bf'),85,55,'Cleaning','250ml',300,'DTL-HW'),
  p('prod-088','biz-8','Dettol Surface Wipes 72s','Dettol','brand-23',CL('dettol.com'),UN('1584820927498-cfe5211fd8bf'),125,80,'Cleaning','72 wipes',150,'DTL-SW72'),
  p('prod-089','biz-8','Dettol All-in-One Spray 400ml','Dettol','brand-23',CL('dettol.com'),UN('1584820927498-cfe5211fd8bf'),155,100,'Cleaning','400ml',180,'DTL-AIO'),

  // Mr Clean (brand-24, biz-8)
  p('prod-090','biz-8','Mr Clean Magic Eraser 4-pack','Mr Clean','brand-24',UI('Mr+Clean','4ade80'),UN('1563453392212-326f5e854473'),185,120,'Cleaning','4-pack',150,'MRC-ME4'),
  p('prod-091','biz-8','Mr Clean Multi-Surface Cleaner 1L','Mr Clean','brand-24',UI('Mr+Clean','4ade80'),UN('1563453392212-326f5e854473'),95,60,'Cleaning','1L',200,'MRC-MS1'),
  p('prod-092','biz-8','Mr Clean Floor Cleaner 2L','Mr Clean','brand-24',UI('Mr+Clean','4ade80'),UN('1563453392212-326f5e854473'),145,95,'Cleaning','2L',120,'MRC-FL2'),

  // Fairy (brand-25, biz-8)
  p('prod-093','biz-8','Fairy Original Dish Soap 750ml','Fairy','brand-25',UI('Fairy','22d3ee'),UN('1563453392212-326f5e854473'),95,60,'Cleaning','750ml',250,'FRY-750'),
  p('prod-094','biz-8','Fairy Platinum Dishwasher Tabs 30s','Fairy','brand-25',UI('Fairy','22d3ee'),UN('1563453392212-326f5e854473'),325,215,'Cleaning','30 tabs',80,'FRY-PT30'),
  p('prod-095','biz-8','Fairy Non-Bio Washing Liquid 1.33L','Fairy','brand-25',UI('Fairy','22d3ee'),UN('1563453392212-326f5e854473'),275,180,'Cleaning','1.33L',100,'FRY-NB'),

  // Bosch (brand-26, biz-1)
  p('prod-096','biz-1','Bosch Serie 4 Dishwasher','Bosch','brand-26',CL('bosch.com'),UN('1585771724684-38269d6639fd'),19500,14800,'Appliances','1pc',5,'BSH-DW4'),
  p('prod-097','biz-1','Bosch GSR 18V Drill','Bosch','brand-26',CL('bosch.com'),UN('1504148455328-c376907d081c'),5500,4100,'Appliances','1pc',12,'BSH-GSR'),
  p('prod-098','biz-1','Bosch TAS1002 Coffee Machine','Bosch','brand-26',CL('bosch.com'),UN('1517256064527-9d584d946eba'),3800,2850,'Appliances','1pc',10,'BSH-TASS'),

  // Whirlpool (brand-27, biz-1)
  p('prod-099','biz-1','Whirlpool 7kg Top Loader','Whirlpool','brand-27',CL('whirlpool.com'),UN('1626806787461-102c1bfaaea1'),15500,11800,'Appliances','1pc',8,'WHP-TL7'),
  p('prod-100','biz-1','Whirlpool 300L Chest Freezer','Whirlpool','brand-27',CL('whirlpool.com'),UN('1571175443880-49e1d25b2bc5'),18000,13500,'Appliances','1pc',6,'WHP-CF3'),
  p('prod-101','biz-1','Whirlpool Microwave 20L','Whirlpool','brand-27',CL('whirlpool.com'),UN('1574269909862-7e1d70bb8078'),4500,3400,'Appliances','1pc',15,'WHP-MW'),

  // Dyson (brand-28, biz-1)
  p('prod-102','biz-1','Dyson V8 Absolute Vacuum','Dyson','brand-28',CL('dyson.com'),UN('1558317374-067fb5f30001'),18500,14000,'Appliances','1pc',8,'DYS-V8'),
  p('prod-103','biz-1','Dyson Pure Cool Tower Fan','Dyson','brand-28',CL('dyson.com'),UN('1622480914584-e07da8b6e6f3'),22000,16500,'Appliances','1pc',5,'DYS-FAN'),
  p('prod-104','biz-1','Dyson Supersonic Hair Dryer','Dyson','brand-28',CL('dyson.com'),UN('1522338242992-e1a54571a9f7'),19500,14800,'Personal Care','1pc',6,'DYS-HD'),

  // McCain (brand-29, biz-3)
  p('prod-105','biz-3','McCain French Fries 1kg','McCain','brand-29',CL('mccain.com'),UN('1573080496219-bb080dd4f877'),125,80,'Food','1kg',200,'MCC-FF1'),
  p('prod-106','biz-3','McCain Potato Wedges 750g','McCain','brand-29',CL('mccain.com'),UN('1573080496219-bb080dd4f877'),115,75,'Food','750g',150,'MCC-PW'),
  p('prod-107','biz-3','McCain Hash Browns 625g','McCain','brand-29',CL('mccain.com'),UN('1573080496219-bb080dd4f877'),105,68,'Food','625g',180,'MCC-HB'),

  // Bonduelle (brand-30, biz-3)
  p('prod-108','biz-3','Bonduelle Sweet Corn 340g','Bonduelle','brand-30',CL('bonduelle.com'),UN('1551754655-cd27e38d2076'),65,42,'Food','340g',250,'BDL-SC'),
  p('prod-109','biz-3','Bonduelle Garden Peas 400g','Bonduelle','brand-30',CL('bonduelle.com'),UN('1587735243615-c03f25aaff15'),55,35,'Food','400g',200,'BDL-GP'),
  p('prod-110','biz-3','Bonduelle Mixed Vegetables 400g','Bonduelle','brand-30',CL('bonduelle.com'),UN('1590779033100-9f60a05a013d'),75,48,'Food','400g',180,'BDL-MV'),
  p('prod-111','biz-3','Bonduelle Cut Green Beans 400g','Bonduelle','brand-30',CL('bonduelle.com'),UN('1567375698348-5d9d5ae10c3e'),60,38,'Food','400g',170,'BDL-GB'),
];

module.exports = { products };
