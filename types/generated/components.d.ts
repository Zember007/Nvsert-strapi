import type { Schema, Struct } from '@strapi/strapi';

export interface SharedContentBlock extends Struct.ComponentSchema {
  collectionName: 'components_shared_content_blocks';
  info: {
    description: 'Flexible content block with headings, text, and images';
    displayName: 'Content Block';
    icon: 'layer-group';
  };
  attributes: {
    blockType: Schema.Attribute.Enumeration<
      ['heading', 'paragraph', 'image', 'rich-text']
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
      'shared.content-block': SharedContentBlock;
      'shared.media': SharedMedia;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.seo': SharedSeo;
      'shared.slider': SharedSlider;
      'shared.string-item': SharedStringItem;
    }
  }
}
