import {
  ParseFileType,
} from '../util/parse-mime.js';
import {
  VideoFileType,
  ImageFileType,
  AnimFileType,
  SupportedFileTypeCategory,
} from '../dto/mimes.dto.js';
import { HasFailed, HasSuccess } from '../types/failable.js';

describe('ParseFileType - Video Support', () => {
  describe('Video file types', () => {
    it('should parse video:mp4 as Video category', () => {
      const result = ParseFileType(VideoFileType.MP4);
      expect(HasSuccess(result)).toBe(true);
      if (HasSuccess(result)) {
        expect(result.category).toBe(SupportedFileTypeCategory.Video);
        expect(result.identifier).toBe(VideoFileType.MP4);
      }
    });

    it('should parse video:webm as Video category', () => {
      const result = ParseFileType(VideoFileType.WEBM);
      expect(HasSuccess(result)).toBe(true);
      if (HasSuccess(result)) {
        expect(result.category).toBe(SupportedFileTypeCategory.Video);
        expect(result.identifier).toBe(VideoFileType.WEBM);
      }
    });

    it('should parse video:mov as Video category', () => {
      const result = ParseFileType(VideoFileType.MOV);
      expect(HasSuccess(result)).toBe(true);
      if (HasSuccess(result)) {
        expect(result.category).toBe(SupportedFileTypeCategory.Video);
        expect(result.identifier).toBe(VideoFileType.MOV);
      }
    });

    it('should parse video:avi as Video category', () => {
      const result = ParseFileType(VideoFileType.AVI);
      expect(HasSuccess(result)).toBe(true);
      if (HasSuccess(result)) {
        expect(result.category).toBe(SupportedFileTypeCategory.Video);
        expect(result.identifier).toBe(VideoFileType.AVI);
      }
    });

    it('should parse video:mkv as Video category', () => {
      const result = ParseFileType(VideoFileType.MKV);
      expect(HasSuccess(result)).toBe(true);
      if (HasSuccess(result)) {
        expect(result.category).toBe(SupportedFileTypeCategory.Video);
        expect(result.identifier).toBe(VideoFileType.MKV);
      }
    });

    it('should parse video:ogv as Video category', () => {
      const result = ParseFileType(VideoFileType.OGV);
      expect(HasSuccess(result)).toBe(true);
      if (HasSuccess(result)) {
        expect(result.category).toBe(SupportedFileTypeCategory.Video);
        expect(result.identifier).toBe(VideoFileType.OGV);
      }
    });
  });

  describe('Image file types (existing functionality)', () => {
    it('should parse image:jpeg as Image category', () => {
      const result = ParseFileType(ImageFileType.JPEG);
      expect(HasSuccess(result)).toBe(true);
      if (HasSuccess(result)) {
        expect(result.category).toBe(SupportedFileTypeCategory.Image);
        expect(result.identifier).toBe(ImageFileType.JPEG);
      }
    });

    it('should parse image:png as Image category', () => {
      const result = ParseFileType(ImageFileType.PNG);
      expect(HasSuccess(result)).toBe(true);
      if (HasSuccess(result)) {
        expect(result.category).toBe(SupportedFileTypeCategory.Image);
        expect(result.identifier).toBe(ImageFileType.PNG);
      }
    });

    it('should parse image:webp as Image category', () => {
      const result = ParseFileType(ImageFileType.WEBP);
      expect(HasSuccess(result)).toBe(true);
      if (HasSuccess(result)) {
        expect(result.category).toBe(SupportedFileTypeCategory.Image);
        expect(result.identifier).toBe(ImageFileType.WEBP);
      }
    });
  });

  describe('Animation file types (existing functionality)', () => {
    it('should parse anim:gif as Animation category', () => {
      const result = ParseFileType(AnimFileType.GIF);
      expect(HasSuccess(result)).toBe(true);
      if (HasSuccess(result)) {
        expect(result.category).toBe(SupportedFileTypeCategory.Animation);
        expect(result.identifier).toBe(AnimFileType.GIF);
      }
    });

    it('should parse anim:webp as Animation category', () => {
      const result = ParseFileType(AnimFileType.WEBP);
      expect(HasSuccess(result)).toBe(true);
      if (HasSuccess(result)) {
        expect(result.category).toBe(SupportedFileTypeCategory.Animation);
        expect(result.identifier).toBe(AnimFileType.WEBP);
      }
    });
  });

  describe('Invalid file types', () => {
    it('should fail for unknown file type', () => {
      const result = ParseFileType('video:unknown');
      expect(HasFailed(result)).toBe(true);
    });

    it('should fail for random string', () => {
      const result = ParseFileType('random');
      expect(HasFailed(result)).toBe(true);
    });

    it('should fail for empty string', () => {
      const result = ParseFileType('');
      expect(HasFailed(result)).toBe(true);
    });
  });
});
