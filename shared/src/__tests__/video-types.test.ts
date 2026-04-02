import {
  VideoFileType,
  SupportedVideoFileTypes,
  SupportedFileTypeCategory,
  FileType2Mime,
  FileType2Ext,
} from '../dto/mimes.dto.js';
import { HasFailed, HasSuccess } from '../types/failable.js';

describe('VideoFileType Enum', () => {
  it('should have MP4 video type', () => {
    expect(VideoFileType.MP4).toBe('video:mp4');
  });

  it('should have WEBM video type', () => {
    expect(VideoFileType.WEBM).toBe('video:webm');
  });

  it('should have MOV video type', () => {
    expect(VideoFileType.MOV).toBe('video:mov');
  });

  it('should have AVI video type', () => {
    expect(VideoFileType.AVI).toBe('video:avi');
  });

  it('should have MKV video type', () => {
    expect(VideoFileType.MKV).toBe('video:mkv');
  });

  it('should have OGV video type', () => {
    expect(VideoFileType.OGV).toBe('video:ogv');
  });
});

describe('SupportedVideoFileTypes', () => {
  it('should contain all video types', () => {
    expect(SupportedVideoFileTypes).toContain(VideoFileType.MP4);
    expect(SupportedVideoFileTypes).toContain(VideoFileType.WEBM);
    expect(SupportedVideoFileTypes).toContain(VideoFileType.MOV);
    expect(SupportedVideoFileTypes).toContain(VideoFileType.AVI);
    expect(SupportedVideoFileTypes).toContain(VideoFileType.MKV);
    expect(SupportedVideoFileTypes).toContain(VideoFileType.OGV);
  });

  it('should have 6 video types', () => {
    expect(SupportedVideoFileTypes.length).toBe(6);
  });
});

describe('SupportedFileTypeCategory', () => {
  it('should have Video category', () => {
    expect(SupportedFileTypeCategory.Video).toBe('video');
  });
});

describe('FileType2Mime', () => {
  it('should convert MP4 to video/mp4', () => {
    const result = FileType2Mime(VideoFileType.MP4);
    expect(HasSuccess(result)).toBe(true);
    if (HasSuccess(result)) {
      expect(result).toBe('video/mp4');
    }
  });

  it('should convert WEBM to video/webm', () => {
    const result = FileType2Mime(VideoFileType.WEBM);
    expect(HasSuccess(result)).toBe(true);
    if (HasSuccess(result)) {
      expect(result).toBe('video/webm');
    }
  });

  it('should convert MOV to video/quicktime', () => {
    const result = FileType2Mime(VideoFileType.MOV);
    expect(HasSuccess(result)).toBe(true);
    if (HasSuccess(result)) {
      expect(result).toBe('video/quicktime');
    }
  });

  it('should convert AVI to video/x-msvideo', () => {
    const result = FileType2Mime(VideoFileType.AVI);
    expect(HasSuccess(result)).toBe(true);
    if (HasSuccess(result)) {
      expect(result).toBe('video/x-msvideo');
    }
  });

  it('should convert MKV to video/x-matroska', () => {
    const result = FileType2Mime(VideoFileType.MKV);
    expect(HasSuccess(result)).toBe(true);
    if (HasSuccess(result)) {
      expect(result).toBe('video/x-matroska');
    }
  });

  it('should convert OGV to video/ogg', () => {
    const result = FileType2Mime(VideoFileType.OGV);
    expect(HasSuccess(result)).toBe(true);
    if (HasSuccess(result)) {
      expect(result).toBe('video/ogg');
    }
  });

  it('should fail for unknown filetype', () => {
    const result = FileType2Mime('video:unknown');
    expect(HasFailed(result)).toBe(true);
  });
});

describe('FileType2Ext', () => {
  it('should convert MP4 filetype to mp4 extension', () => {
    const result = FileType2Ext(VideoFileType.MP4);
    expect(HasSuccess(result)).toBe(true);
    if (HasSuccess(result)) {
      expect(result).toBe('mp4');
    }
  });

  it('should convert WEBM filetype to webm extension', () => {
    const result = FileType2Ext(VideoFileType.WEBM);
    expect(HasSuccess(result)).toBe(true);
    if (HasSuccess(result)) {
      expect(result).toBe('webm');
    }
  });

  it('should convert MOV filetype to mov extension', () => {
    const result = FileType2Ext(VideoFileType.MOV);
    expect(HasSuccess(result)).toBe(true);
    if (HasSuccess(result)) {
      expect(result).toBe('mov');
    }
  });

  it('should convert AVI filetype to avi extension', () => {
    const result = FileType2Ext(VideoFileType.AVI);
    expect(HasSuccess(result)).toBe(true);
    if (HasSuccess(result)) {
      expect(result).toBe('avi');
    }
  });

  it('should convert MKV filetype to mkv extension', () => {
    const result = FileType2Ext(VideoFileType.MKV);
    expect(HasSuccess(result)).toBe(true);
    if (HasSuccess(result)) {
      expect(result).toBe('mkv');
    }
  });

  it('should convert OGV filetype to ogv extension', () => {
    const result = FileType2Ext(VideoFileType.OGV);
    expect(HasSuccess(result)).toBe(true);
    if (HasSuccess(result)) {
      expect(result).toBe('ogv');
    }
  });

  it('should fail for unknown filetype', () => {
    const result = FileType2Ext('video:unknown');
    expect(HasFailed(result)).toBe(true);
  });
});
