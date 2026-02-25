/**
 * Donation resources (external orgs) per category.
 * Names and descriptions are in locales (donationResources namespace).
 */
export interface DonationResource {
  nameKey: string;
  descriptionKey: string;
  url: string;
}

export const donationResources: Record<string, DonationResource[]> = {
  food: [
    { nameKey: 'donationResources:food.0.name', descriptionKey: 'donationResources:food.0.description', url: 'https://www.leket.org/' },
    { nameKey: 'donationResources:food.1.name', descriptionKey: 'donationResources:food.1.description', url: 'https://www.latet.org.il/' },
    { nameKey: 'donationResources:food.2.name', descriptionKey: 'donationResources:food.2.description', url: 'https://www.bly.org.il/' },
    { nameKey: 'donationResources:food.3.name', descriptionKey: 'donationResources:food.3.description', url: 'https://www.food-for-life.org/' },
    { nameKey: 'donationResources:food.4.name', descriptionKey: 'donationResources:food.4.description', url: 'https://yadezra.org.il/' },
  ],
  knowledge: [
    { nameKey: 'donationResources:knowledge.0.name', descriptionKey: 'donationResources:knowledge.0.description', url: 'https://www.perach.org.il/' },
    { nameKey: 'donationResources:knowledge.1.name', descriptionKey: 'donationResources:knowledge.1.description', url: 'https://www.elem.org.il/' },
    { nameKey: 'donationResources:knowledge.2.name', descriptionKey: 'donationResources:knowledge.2.description', url: 'https://www.telem.org/' },
    { nameKey: 'donationResources:knowledge.3.name', descriptionKey: 'donationResources:knowledge.3.description', url: 'https://www.avney-derech.org.il/' },
    { nameKey: 'donationResources:knowledge.4.name', descriptionKey: 'donationResources:knowledge.4.description', url: 'https://www.yadlakol.org.il/' },
  ],
  clothes: [
    { nameKey: 'donationResources:clothes.0.name', descriptionKey: 'donationResources:clothes.0.description', url: 'https://www.yadsarah.org.il/' },
    { nameKey: 'donationResources:clothes.1.name', descriptionKey: 'donationResources:clothes.1.description', url: 'https://www.pitchonlev.org.il/' },
    { nameKey: 'donationResources:clothes.2.name', descriptionKey: 'donationResources:clothes.2.description', url: 'https://wizo.org.il/' },
    { nameKey: 'donationResources:clothes.3.name', descriptionKey: 'donationResources:clothes.3.description', url: 'https://www.goodwill.org.il/' },
    { nameKey: 'donationResources:clothes.4.name', descriptionKey: 'donationResources:clothes.4.description', url: 'https://www.chasdei-naomi.org/' },
  ],
  books: [
    { nameKey: 'donationResources:books.0.name', descriptionKey: 'donationResources:books.0.description', url: 'https://www.sifriyatpijama.org.il/' },
    { nameKey: 'donationResources:books.1.name', descriptionKey: 'donationResources:books.1.description', url: 'https://www.rebooks.org.il/' },
    { nameKey: 'donationResources:books.2.name', descriptionKey: 'donationResources:books.2.description', url: 'https://www.ort.org.il/' },
    { nameKey: 'donationResources:books.3.name', descriptionKey: 'donationResources:books.3.description', url: 'https://ranweber.com/donate/' },
    { nameKey: 'donationResources:books.4.name', descriptionKey: 'donationResources:books.4.description', url: 'https://www.library.org.il/' },
  ],
  furniture: [
    { nameKey: 'donationResources:furniture.0.name', descriptionKey: 'donationResources:furniture.0.description', url: 'https://www.yadsarah.org.il/' },
    { nameKey: 'donationResources:furniture.1.name', descriptionKey: 'donationResources:furniture.1.description', url: 'https://www.pitchonlev.org.il/' },
    { nameKey: 'donationResources:furniture.2.name', descriptionKey: 'donationResources:furniture.2.description', url: 'https://www.yesh.org.il/' },
    { nameKey: 'donationResources:furniture.3.name', descriptionKey: 'donationResources:furniture.3.description', url: 'https://www.latet.org.il/' },
  ],
  medical: [
    { nameKey: 'donationResources:medical.0.name', descriptionKey: 'donationResources:medical.0.description', url: 'https://www.yadsarah.org.il/' },
    { nameKey: 'donationResources:medical.1.name', descriptionKey: 'donationResources:medical.1.description', url: 'https://www.haverim.org.il/' },
    { nameKey: 'donationResources:medical.2.name', descriptionKey: 'donationResources:medical.2.description', url: 'https://refuah-vechaim.org.il/' },
    { nameKey: 'donationResources:medical.3.name', descriptionKey: 'donationResources:medical.3.description', url: 'https://www.zichron.org/' },
    { nameKey: 'donationResources:medical.4.name', descriptionKey: 'donationResources:medical.4.description', url: 'https://www.ezer-mizion.org.il/' },
  ],
  animals: [
    { nameKey: 'donationResources:animals.0.name', descriptionKey: 'donationResources:animals.0.description', url: 'https://spca.co.il/' },
    { nameKey: 'donationResources:animals.1.name', descriptionKey: 'donationResources:animals.1.description', url: 'https://www.letlive.org.il/' },
    { nameKey: 'donationResources:animals.2.name', descriptionKey: 'donationResources:animals.2.description', url: 'https://sospets.co.il/' },
    { nameKey: 'donationResources:animals.3.name', descriptionKey: 'donationResources:animals.3.description', url: 'https://www.hakol-chai.org.il/' },
  ],
  housing: [
    { nameKey: 'donationResources:housing.0.name', descriptionKey: 'donationResources:housing.0.description', url: 'https://www.elem.org.il/' },
    { nameKey: 'donationResources:housing.1.name', descriptionKey: 'donationResources:housing.1.description', url: 'https://www.batmelech.org/' },
    { nameKey: 'donationResources:housing.2.name', descriptionKey: 'donationResources:housing.2.description', url: 'https://www.wizo.org.il/' },
    { nameKey: 'donationResources:housing.3.name', descriptionKey: 'donationResources:housing.3.description', url: 'https://www.latet.org.il/' },
    { nameKey: 'donationResources:housing.4.name', descriptionKey: 'donationResources:housing.4.description', url: 'https://l-b.org.il/' },
  ],
  support: [
    { nameKey: 'donationResources:support.0.name', descriptionKey: 'donationResources:support.0.description', url: 'https://www.eran.org.il/' },
    { nameKey: 'donationResources:support.1.name', descriptionKey: 'donationResources:support.1.description', url: 'https://www.sahar.org.il/' },
    { nameKey: 'donationResources:support.2.name', descriptionKey: 'donationResources:support.2.description', url: 'https://www.natal.org.il/' },
    { nameKey: 'donationResources:support.3.name', descriptionKey: 'donationResources:support.3.description', url: 'https://www.enosh.org.il/' },
    { nameKey: 'donationResources:support.4.name', descriptionKey: 'donationResources:support.4.description', url: 'https://www.elem.org.il/' },
  ],
  education: [
    { nameKey: 'donationResources:education.0.name', descriptionKey: 'donationResources:education.0.description', url: 'https://www.perach.org.il/' },
    { nameKey: 'donationResources:education.1.name', descriptionKey: 'donationResources:education.1.description', url: 'https://www.yadidlechinuch.org.il/' },
    { nameKey: 'donationResources:education.2.name', descriptionKey: 'donationResources:education.2.description', url: 'https://www.ort.org.il/' },
    { nameKey: 'donationResources:education.3.name', descriptionKey: 'donationResources:education.3.description', url: 'https://www.telem.org/' },
    { nameKey: 'donationResources:education.4.name', descriptionKey: 'donationResources:education.4.description', url: 'https://www.avney-derech.org.il/' },
  ],
  environment: [
    { nameKey: 'donationResources:environment.0.name', descriptionKey: 'donationResources:environment.0.description', url: 'https://www.sviva.gov.il/' },
    { nameKey: 'donationResources:environment.1.name', descriptionKey: 'donationResources:environment.1.description', url: 'https://www.teva.org.il/' },
    { nameKey: 'donationResources:environment.2.name', descriptionKey: 'donationResources:environment.2.description', url: 'https://www.adamteva.org.il/' },
    { nameKey: 'donationResources:environment.3.name', descriptionKey: 'donationResources:environment.3.description', url: 'https://www.greenpeace.org/israel/' },
    { nameKey: 'donationResources:environment.4.name', descriptionKey: 'donationResources:environment.4.description', url: 'https://www.zalul.org.il/' },
  ],
  technology: [
    { nameKey: 'donationResources:technology.0.name', descriptionKey: 'donationResources:technology.0.description', url: 'https://www.begifted.org/' },
    { nameKey: 'donationResources:technology.1.name', descriptionKey: 'donationResources:technology.1.description', url: 'https://www.digitalpeace.org.il/' },
    { nameKey: 'donationResources:technology.2.name', descriptionKey: 'donationResources:technology.2.description', url: 'https://www.tzofen.org.il/' },
    { nameKey: 'donationResources:technology.3.name', descriptionKey: 'donationResources:technology.3.description', url: 'https://www.code4good.org.il/' },
    { nameKey: 'donationResources:technology.4.name', descriptionKey: 'donationResources:technology.4.description', url: 'https://www.tech-career.org/' },
  ],
  time: [
    { nameKey: 'donationResources:time.0.name', descriptionKey: 'donationResources:time.0.description', url: 'https://www.ruachtova.org.il/' },
    { nameKey: 'donationResources:time.1.name', descriptionKey: 'donationResources:time.1.description', url: 'https://ivolunteer.org.il/' },
    { nameKey: 'donationResources:time.2.name', descriptionKey: 'donationResources:time.2.description', url: 'https://www.latet.org.il/volunteering/' },
    { nameKey: 'donationResources:time.3.name', descriptionKey: 'donationResources:time.3.description', url: 'https://www.mdais.org/volunteers' },
    { nameKey: 'donationResources:time.4.name', descriptionKey: 'donationResources:time.4.description', url: 'https://www.israelaid.org.il/volunteer' },
    { nameKey: 'donationResources:time.5.name', descriptionKey: 'donationResources:time.5.description', url: 'https://www.rakchiyuch.org.il/' },
    { nameKey: 'donationResources:time.6.name', descriptionKey: 'donationResources:time.6.description', url: 'https://sherut-leumi.co.il/' },
    { nameKey: 'donationResources:time.7.name', descriptionKey: 'donationResources:time.7.description', url: 'https://www.begifted.org/' },
  ],
};
