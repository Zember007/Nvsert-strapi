import type { Schema, Struct } from '@strapi/strapi';

export interface ContactsOffice extends Struct.ComponentSchema {
  collectionName: 'components_contacts_offices';
  info: {
    description: '\u041E\u0444\u0438\u0441/\u0444\u0438\u043B\u0438\u0430\u043B \u0434\u043B\u044F \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u043E\u0432';
    displayName: 'Office';
    icon: 'map-marked-alt';
  };
  attributes: {
    address: Schema.Attribute.String & Schema.Attribute.Required;
    city: Schema.Attribute.String & Schema.Attribute.Required;
    email: Schema.Attribute.Email;
    image: Schema.Attribute.Media<'images'>;
    phones: Schema.Attribute.Component<'shared.string-item', true>;
  };
}

export interface ContactsFeatureCard extends Struct.ComponentSchema {
  collectionName: 'components_contacts_feature_cards';
  info: {
    description: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043F\u0440\u0435\u0438\u043C\u0443\u0449\u0435\u0441\u0442\u0432/\u0431\u043B\u043E\u043A\u043E\u0432 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \u043A\u043E\u043D\u0442\u0430\u043A\u0442\u043E\u0432';
    displayName: 'Feature card';
    icon: 'square';
  };
  attributes: {
    text: Schema.Attribute.Text & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ContactsLegalDetails extends Struct.ComponentSchema {
  collectionName: 'components_contacts_legal_details';
  info: {
    description: '\u042E\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043A\u0438\u0435/\u0431\u0430\u043D\u043A\u043E\u0432\u0441\u043A\u0438\u0435 \u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B';
    displayName: 'Legal details';
    icon: 'file-invoice';
  };
  attributes: {
    accountNumber: Schema.Attribute.String;
    bank: Schema.Attribute.String;
    bik: Schema.Attribute.String;
    chiefAccountant: Schema.Attribute.String;
    corrAccount: Schema.Attribute.String;
    director: Schema.Attribute.String;
    email: Schema.Attribute.Email;
    fullName: Schema.Attribute.String & Schema.Attribute.Required;
    inn: Schema.Attribute.String;
    kpp: Schema.Attribute.String;
    legalAddress: Schema.Attribute.String;
    ogrn: Schema.Attribute.String;
    phone: Schema.Attribute.String;
    shortName: Schema.Attribute.String;
  };
}

export interface ContactsConnectSection extends Struct.ComponentSchema {
  collectionName: 'components_contacts_connect_sections';
  info: {
    description: '\u0421\u0435\u043A\u0446\u0438\u044F \u00AB\u0421\u0432\u044F\u0437\u0430\u0442\u044C\u0441\u044F \u0441 \u043D\u0430\u043C\u0438\u00BB (\u043A\u043E\u043D\u0442\u0435\u043D\u0442 \u0432\u043D\u0443\u0442\u0440\u0438 \u0441\u043F\u043E\u0439\u043B\u0435\u0440\u0430)';
    displayName: 'Connect section';
    icon: 'address-card';
  };
  attributes: {
    consultationButtonLabel: Schema.Attribute.String & Schema.Attribute.Required;
    consultationImage: Schema.Attribute.Media<'images'>;
    consultationText: Schema.Attribute.RichText & Schema.Attribute.Required;
    consultationTitle: Schema.Attribute.String & Schema.Attribute.Required;
    description: Schema.Attribute.RichText & Schema.Attribute.Required;
    featureCards: Schema.Attribute.Component<'contacts.feature-card', true>;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    spoilerTitle: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ContactsRequisitesSection extends Struct.ComponentSchema {
  collectionName: 'components_contacts_requisites_sections';
  info: {
    description: '\u0421\u0435\u043A\u0446\u0438\u044F \u00AB\u0420\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B\u00BB (\u043A\u043E\u043D\u0442\u0435\u043D\u0442 \u0432\u043D\u0443\u0442\u0440\u0438 \u0441\u043F\u043E\u0439\u043B\u0435\u0440\u0430)';
    displayName: 'Requisites section';
    icon: 'money-check';
  };
  attributes: {
    description: Schema.Attribute.RichText & Schema.Attribute.Required;
    downloadButtonLabel: Schema.Attribute.String & Schema.Attribute.Required;
    heading: Schema.Attribute.String & Schema.Attribute.Required;
    image: Schema.Attribute.Media<'images'>;
    legal: Schema.Attribute.Component<'contacts.legal-details', false> &
      Schema.Attribute.Required;
    pdfUrl: Schema.Attribute.String & Schema.Attribute.Required;
    spoilerTitle: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedContentBlock extends Struct.ComponentSchema {
  collectionName: 'components_shared_content_blocks';
  info: {
    description: 'Flexible content block with headings, text, and images';
    displayName: 'Content Block';
    icon: 'layer-group';
  };
  attributes: {
    blockType: Schema.Attribute.Enumeration<
      ['paragraph', 'image', 'rich-text']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'paragraph'>;
    heading: Schema.Attribute.String;
    headingLevel: Schema.Attribute.Enumeration<
      ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
    > &
      Schema.Attribute.DefaultTo<'h2'>;
    image: Schema.Attribute.Media<'images'>;
    imageCaption: Schema.Attribute.String;
    order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    richText: Schema.Attribute.RichText;
    text: Schema.Attribute.Text;
  };
}

export interface SharedCta extends Struct.ComponentSchema {
  collectionName: 'components_shared_ctas';
  info: {
    description: 'Call to action component';
    displayName: 'CTA';
    icon: 'cursor';
    name: 'Cta';
  };
  attributes: {
    description: Schema.Attribute.String & Schema.Attribute.Required;
    style: Schema.Attribute.Enumeration<['primary', 'secondary', 'outline']> &
      Schema.Attribute.DefaultTo<'primary'>;
    text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_media';
  info: {
    displayName: 'Media';
    icon: 'file-video';
  };
  attributes: {
    file: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface SharedQuote extends Struct.ComponentSchema {
  collectionName: 'components_shared_quotes';
  info: {
    displayName: 'Quote';
    icon: 'indent';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    description: '';
    displayName: 'Rich text';
    icon: 'align-justify';
  };
  attributes: {
    body: Schema.Attribute.RichText;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_sliders';
  info: {
    description: '';
    displayName: 'Slider';
    icon: 'address-book';
  };
  attributes: {
    files: Schema.Attribute.Media<'images', true>;
  };
}

export interface SharedStringItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_string_items';
  info: {
    description: 'Single string value for repeatable lists';
    displayName: 'String item';
    icon: 'dot-circle';
    name: 'String item';
  };
  attributes: {
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'contacts.connect-section': ContactsConnectSection;
      'contacts.feature-card': ContactsFeatureCard;
      'contacts.legal-details': ContactsLegalDetails;
      'contacts.office': ContactsOffice;
      'contacts.requisites-section': ContactsRequisitesSection;
      'shared.content-block': SharedContentBlock;
      'shared.cta': SharedCta;
      'shared.media': SharedMedia;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.seo': SharedSeo;
      'shared.slider': SharedSlider;
      'shared.string-item': SharedStringItem;
    }
  }
}
